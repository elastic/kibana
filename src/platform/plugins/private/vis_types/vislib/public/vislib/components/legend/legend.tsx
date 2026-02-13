/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BaseSyntheticEvent, KeyboardEvent } from 'react';
import React, { PureComponent } from 'react';
import classNames from 'classnames';
import { compact, uniqBy, map, every, isUndefined } from 'lodash';

import { i18n } from '@kbn/i18n';
import { asyncForEach } from '@kbn/std';
import {
  type EuiPopoverProps,
  EuiIcon,
  keys,
  htmlIdGenerator,
  type UseEuiTheme,
  euiScrollBarStyles,
  euiFontSize,
} from '@elastic/eui';

import type { PersistedState } from '@kbn/visualizations-plugin/public';
import type { IInterpreterRenderHandlers } from '@kbn/expressions-plugin/public';

import { css } from '@emotion/react';
import chroma from 'chroma-js';
import { VALUE_CLICK_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { LegendItem } from './models';
import { CUSTOM_LEGEND_VIS_TYPES } from './models';
import { VisLegendItem } from './legend_item';
import type { BasicVislibParams } from '../../../types';

export interface VisLegendProps {
  vislibVis: any;
  visData: unknown;
  uiState?: PersistedState;
  fireEvent: IInterpreterRenderHandlers['event'];
  hasCompatibleActions: IInterpreterRenderHandlers['hasCompatibleActions'];
  addLegend: BasicVislibParams['addLegend'];
  position: 'top' | 'bottom' | 'left' | 'right';
}

export interface VisLegendState {
  open: boolean;
  labels: any[];
  filterableLabels: Set<string>;
  selectedLabel: string | null;
}

const visLegendStyles = {
  inEmbPanel: css({
    '.embPanel &': {
      borderBottomRightRadius: 0,
      borderTopLeftRadius: 0,
      opacity: 0, // Fix overflow of vis's specifically for inside embeddable panels, lets the panel decide the overflow

      '&:focus': {
        opacity: 1,
      },
    },
    '.embPanel:hover &': {
      opacity: 1,
    },
    '.embPanel--editing &': {
      opacity: 1, // Always show in editing mode
    },
  }),
  base: css({
    display: `flex`,
    minHeight: 0,
    height: `100%`,
  }),
  toggle: ({ euiTheme }: UseEuiTheme) =>
    css`
      border-radius: ${euiTheme.border.radius.medium};
      position: absolute;
      bottom: 0;
      left: 0;
      display: flex;
      padding: ${euiTheme.size.xs};
      margin: ${euiTheme.size.s};
      background-color: ${euiTheme.colors.backgroundBasePlain};
      transition: opacity ${euiTheme.animation.fast} ${euiTheme.animation.resistance},
        background-color ${euiTheme.animation.fast} ${euiTheme.animation.resistance}
          ${euiTheme.animation.extraSlow};

      &:focus {
        box-shadow: none;
        background-color: ${euiTheme.focus.backgroundColor} !important;
      }
    `,
  openToggle: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: chroma(euiTheme.colors.darkestShade).alpha(0.1).css(),
      opacity: 1,
    }),
  list: (euiThemeContext: UseEuiTheme) => css`
    display: flex;
    width: 150px; // Must be a hard-coded width for the chart to get its correct dimensions
    flex: 1 1 auto;
    flex-direction: column;
    overflow-x: hidden;
    overflow-y: auto;

    ${euiScrollBarStyles(euiThemeContext)}
    .visLegend__button {
      font-size: ${euiFontSize(euiThemeContext, 'xs').fontSize};
      text-align: left;
      overflow: hidden; // Ensures scrollbars don't appear because EuiButton__text has a high line-height

      .visLegend__valueTitle {
        vertical-align: middle;
      }
    }

    .vislib--legend-top &,
    .vislib--legend-bottom & {
      width: auto;
      flex-direction: row;
      flex-wrap: wrap;

      .visLegend__value {
        flex-grow: 0;
        max-width: 150px;
      }
    }

    .vislib--legend-left & {
      margin-bottom: ${euiThemeContext.euiTheme.size.l};
    }

    .vislib--legend-bottom & {
      margin-left: ${euiThemeContext.euiTheme.size.xl};
    }

    &.hidden {
      visibility: hidden;
    }
  `,
};

export class VisLegend extends PureComponent<VisLegendProps, VisLegendState> {
  legendId = htmlIdGenerator()('legend');
  getColor: (label: string) => string = () => '';

  constructor(props: VisLegendProps) {
    super(props);

    // TODO: Check when this bwc can safely be removed
    const bwcLegendStateDefault = props.addLegend ?? true;
    const open = props.uiState?.get('vis.legendOpen', bwcLegendStateDefault) as boolean;

    this.state = {
      open,
      labels: [],
      filterableLabels: new Set(),
      selectedLabel: null,
    };
  }

  componentDidMount() {
    this.refresh();
  }

  toggleLegend = () => {
    const newOpen = !this.state.open;
    this.setState({ open: newOpen }, () => {
      this.props.uiState?.set('vis.legendOpen', newOpen);
    });
  };

  setColor = (label: string | number, color: string | null, event: BaseSyntheticEvent) => {
    if ((event as KeyboardEvent).key && (event as KeyboardEvent).key !== keys.ENTER) {
      return;
    }

    this.setState({ selectedLabel: null }, () => {
      const colors = this.props.uiState?.get('vis.colors') || {};
      if (colors[label] === color || !color) delete colors[label];
      else colors[label] = color;
      this.props.uiState?.setSilent('vis.colors', null);
      this.props.uiState?.set('vis.colors', colors);
      this.props.uiState?.emit('colorChanged');
      this.refresh();
    });
  };

  filter = ({ values: data }: LegendItem, negate: boolean) => {
    this.props.fireEvent({
      name: 'filter',
      data: {
        data,
        negate,
      },
    });
  };

  canFilter = async (item: LegendItem): Promise<boolean> => {
    if (CUSTOM_LEGEND_VIS_TYPES.includes(this.props.vislibVis.visConfigArgs.type)) {
      return false;
    }

    if (item.values && every(item.values, isUndefined)) {
      return false;
    }

    const filters = this.props.hasCompatibleActions
      ? await this.props.hasCompatibleActions({
          name: VALUE_CLICK_TRIGGER,
          data: item.values,
        })
      : false;
    return filters;
  };

  toggleDetails = (label: string | null) => (event?: BaseSyntheticEvent) => {
    if (event && (event as KeyboardEvent).key && (event as KeyboardEvent).key !== keys.ENTER) {
      return;
    }
    this.setState({ selectedLabel: this.state.selectedLabel === label ? null : label });
  };

  getSeriesLabels = (data: any[]) => {
    const values = data.map((chart) => chart.series).reduce((a, b) => a.concat(b), []);

    return compact(uniqBy(values, 'label')).map((label: any) => ({
      ...label,
      values: [label.values[0].seriesRaw],
    }));
  };

  setFilterableLabels = (items: LegendItem[]): Promise<void> =>
    new Promise(async (resolve, reject) => {
      try {
        const filterableLabels = new Set<string>();
        await asyncForEach(items, async (item) => {
          const canFilter = await this.canFilter(item);

          if (canFilter) {
            filterableLabels.add(item.label);
          }
        });

        this.setState(
          {
            filterableLabels,
          },
          resolve
        );
      } catch (error) {
        reject(error);
      }
    });

  setLabels = (data: any, type: string) => {
    let labels = [];
    if (CUSTOM_LEGEND_VIS_TYPES.includes(type)) {
      const legendLabels = this.props.vislibVis.getLegendLabels();
      if (legendLabels) {
        labels = map(legendLabels, (label) => {
          return { label };
        });
      }
    } else {
      if (!data) return [];
      data = data.columns || data.rows || [data];

      labels = this.getSeriesLabels(data);
    }

    this.setFilterableLabels(labels);

    this.setState({
      labels,
    });
  };

  refresh = () => {
    const vislibVis = this.props.vislibVis;
    if (!vislibVis || !vislibVis.visConfig) {
      this.setState({
        labels: [
          {
            label: i18n.translate('visTypeVislib.vislib.legend.loadingLabel', {
              defaultMessage: 'loading…',
            }),
          },
        ],
      });
      return;
    } // make sure vislib is defined at this point

    if (this.props.uiState?.get('vis.legendOpen') == null && this.props.addLegend != null) {
      this.setState({ open: this.props.addLegend });
    }

    if (vislibVis.visConfig) {
      this.getColor = this.props.vislibVis.visConfig.data.getColorFunc();
    }

    this.setLabels(this.props.visData, vislibVis.visConfigArgs.type);
  };

  highlight = (event: BaseSyntheticEvent) => {
    const el = event.currentTarget;
    const handler = this.props.vislibVis && this.props.vislibVis.handler;

    // there is no guarantee that a Chart will set the highlight-function on its handler
    if (!handler || typeof handler.highlight !== 'function') {
      return;
    }
    handler.highlight.call(el, handler.el);
  };

  unhighlight = (event: BaseSyntheticEvent) => {
    const el = event.currentTarget;
    const handler = this.props.vislibVis && this.props.vislibVis.handler;

    // there is no guarantee that a Chart will set the unhighlight-function on its handler
    if (!handler || typeof handler.unHighlight !== 'function') {
      return;
    }
    handler.unHighlight.call(el, handler.el);
  };

  getAnchorPosition = () => {
    const { position } = this.props;

    switch (position) {
      case 'bottom':
        return 'upCenter';
      case 'left':
        return 'rightUp';
      case 'right':
        return 'leftUp';
      default:
        return 'downCenter';
    }
  };

  renderLegend = (anchorPosition: EuiPopoverProps['anchorPosition']) => (
    <ul className="visLegend__list" id={this.legendId} css={visLegendStyles.list}>
      {this.state.labels.map((item) => (
        <VisLegendItem
          item={item}
          key={item.label}
          anchorPosition={anchorPosition}
          selected={this.state.selectedLabel === item.label}
          canFilter={this.state.filterableLabels.has(item.label)}
          onFilter={this.filter}
          onSelect={this.toggleDetails}
          setColor={this.setColor}
          getColor={this.getColor}
          onHighlight={this.highlight}
          onUnhighlight={this.unhighlight}
        />
      ))}
    </ul>
  );

  render() {
    const { open } = this.state;
    const anchorPosition = this.getAnchorPosition();

    return (
      <div className="visLegend" css={visLegendStyles.base}>
        <button
          type="button"
          onClick={this.toggleLegend}
          className={classNames('visLegend__toggle kbn-resetFocusState', {
            'visLegend__toggle--isOpen': open,
          })}
          aria-label={i18n.translate('visTypeVislib.vislib.legend.toggleLegendButtonAriaLabel', {
            defaultMessage: 'Toggle legend',
          })}
          aria-expanded={Boolean(open)}
          aria-controls={this.legendId}
          data-test-subj="vislibToggleLegend"
          title={i18n.translate('visTypeVislib.vislib.legend.toggleLegendButtonTitle', {
            defaultMessage: 'Toggle legend',
          })}
          css={[
            visLegendStyles.inEmbPanel,
            visLegendStyles.toggle,
            open && visLegendStyles.openToggle,
          ]}
        >
          <EuiIcon color="text" type="list" />
        </button>
        {open && this.renderLegend(anchorPosition)}
      </div>
    );
  }
}
