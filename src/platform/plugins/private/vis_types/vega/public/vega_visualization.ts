/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { View } from 'vega';
import type { VegaRenderDescriptor } from './data_model/types';
import type { VegaVisualizationDependencies } from './plugin';
import type { VegaEventHandler } from './types';
import type { VegaInspectorAdapters } from './vega_inspector';
import type { DebugValues } from './vega_inspector/vega_adapter';
import { getNotifications, getData } from './services';
import type { VegaView } from './vega_view/vega_view';
import { createVegaStateRestorer } from './lib/vega_state_restorer';
import { createVegaFilterActionHandler } from './vega_view/vega_filter_action_handler';

export type VegaVisType = new (el: HTMLDivElement, fireEvent: VegaEventHandler) => {
  render(visData: VegaRenderDescriptor, inspectorAdapters?: VegaInspectorAdapters): Promise<void>;
  resize(dimensions?: { height: number; width: number }): Promise<void>;
  destroy(): void;
};

export const createVegaVisualization = (
  { core, getServiceSettings }: VegaVisualizationDependencies,
  showWarnings: boolean
): VegaVisType =>
  class VegaVisualization {
    private readonly dataPlugin = getData();
    private vegaView: InstanceType<typeof VegaView> | null = null;
    private vegaStateRestorer = createVegaStateRestorer({
      isActive: () => Boolean(this.vegaView?._descriptor?.restoreSignalValuesOnRefresh),
    });

    constructor(private el: HTMLDivElement, private fireEvent: VegaEventHandler) {}

    async render(visData: VegaRenderDescriptor, inspectorAdapters?: VegaInspectorAdapters) {
      const { toasts } = getNotifications();

      if (!visData && !this.vegaView) {
        toasts.addWarning(
          i18n.translate('visTypeVega.visualization.unableToRenderWithoutDataWarningMessage', {
            defaultMessage: 'Unable to render without data',
          })
        );
        return;
      }

      try {
        await this._render(visData, inspectorAdapters);
      } catch (error) {
        if (this.vegaView) {
          this.vegaView.onError(error);
        } else {
          toasts.addError(error, {
            title: i18n.translate('visTypeVega.visualization.renderErrorTitle', {
              defaultMessage: 'Vega error',
            }),
          });
        }
      }
    }

    async _render(descriptor: VegaRenderDescriptor, inspectorAdapters?: VegaInspectorAdapters) {
      if (descriptor) {
        inspectorAdapters?.vega.clearError();
        // New data received, rebuild the graph
        if (this.vegaView) {
          await this.vegaView.destroy();
          this.vegaView = null;
        }

        const serviceSettings = await getServiceSettings();
        const vegaViewParams = {
          externalUrl: core.http.externalUrl,
          parentEl: this.el,
          vegaStateRestorer: this.vegaStateRestorer,
          descriptor,
          onError: (message: string) => inspectorAdapters?.vega.setError(message),
          onViewCreated: (view: View) =>
            inspectorAdapters?.vega.bindInspectValues({
              // The inspector reads Vega's internal `_runtime`, which the public View type omits.
              view: view as DebugValues['view'],
              spec: descriptor.vlspec || descriptor.spec,
            }),
          onFilterAction: createVegaFilterActionHandler({
            spec: descriptor.isVegaLite && descriptor.vlspec ? descriptor.vlspec : descriptor.spec,
            filterManager: this.dataPlugin.query.filterManager,
            fireEvent: this.fireEvent,
          }),
          serviceSettings,
          showWarnings,
        };

        if (descriptor.useMap) {
          const { VegaMapView } = await import('./vega_view/vega_map_view/view');
          this.vegaView = new VegaMapView(vegaViewParams);
        } else {
          const { VegaView: VegaViewClass } = await import('./async_services');
          this.vegaView = new VegaViewClass(vegaViewParams);
        }
        await this.vegaView?.init();
      }
    }

    async resize(dimensions?: { height: number; width: number }) {
      return this.vegaView?.resize(dimensions);
    }

    destroy() {
      this.vegaStateRestorer.clear();
      this.vegaView?.destroy();
    }
  };
