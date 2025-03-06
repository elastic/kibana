/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentType, ReactElement, ReactNode } from 'react';
import type { InjectedIntl } from '@kbn/i18n-react';
import { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { EuiContextMenuPanelItemDescriptorEntry } from '@elastic/eui/src/components/context_menu/context_menu';
import type { Capabilities, ThemeServiceSetup, ToastsSetup } from '@kbn/core/public';
import type { UrlService, LocatorPublic } from '../common/url_service';
import type { BrowserShortUrlClientFactoryCreateParams } from './url_service/short_urls/short_url_client_factory';
import type { BrowserShortUrlClient } from './url_service/short_urls/short_url_client';

export type BrowserUrlService = UrlService<
  BrowserShortUrlClientFactoryCreateParams,
  BrowserShortUrlClient
>;

export interface ShareContextObjectTypeConfig {
  draftModeCallOut?: ReactNode;
  computeAnonymousCapabilities?: (anonymousUserCapabilities: Capabilities) => boolean;
}

/**
 * @public
 * Properties of the current object to share. Registered share
 * menu providers will provide suitable items which have to
 * be rendered in an appropriate place by the caller.
 *
 * It is possible to use the static function `toggleShareContextMenu`
 * to render the menu as a popover.
 * */
export interface ShareContext {
  objectType: string;
  /**
   * Allows for passing contextual information that each consumer can provide to customize the share menu
   */
  objectTypeMeta: {
    title: string;
    config?: Partial<Record<'link' | 'export' | 'embed', ShareContextObjectTypeConfig>>;
  };
  objectId?: string;
  /**
   * Current url for sharing. This can be set in cases where `window.location.href`
   * does not contain a shareable URL (e.g. if using session storage to store the current
   * app state is enabled). In these cases the property should contain the URL in a
   * format which makes it possible to use it without having access to any other state
   * like the current session.
   *
   * If not set it will default to `window.location.href`
   */
  shareableUrl?: string;
  /**
   * @deprecated prefer {@link delegatedShareUrlHandler}
   */
  shareableUrlForSavedObject?: string;
  shareableUrlLocatorParams?: {
    locator: LocatorPublic<any>;
    params: any;
  };
  /**
   *
   * @description allows a consumer to provide a custom method which when invoked
   * handles providing a share url in the context of said consumer
   */
  delegatedShareUrlHandler?: () => string;
  sharingData: { [key: string]: unknown };
  isDirty: boolean;
  onClose: () => void;
  /**
   * @deprecated use computeAnonymousCapabilities defined on objectTypeMeta config
   */
  showPublicUrlSwitch?: (anonymousUserCapabilities: Capabilities) => boolean;
  disabledShareUrl?: boolean;
  toasts: ToastsSetup;
}

/**
 * @public
 * Eui context menu entry shown directly in the context menu. `sortOrder` is
 * used to order the individual items in a flat list returned by all registered
 * menu providers.
 * */
export interface ShareContextMenuPanelItem
  extends Omit<EuiContextMenuPanelItemDescriptorEntry, 'name'> {
  name: string; // EUI will accept a `ReactNode` for the `name` prop, but `ShareContentMenu` assumes a `string`.
  sortOrder?: number;
}

export type SupportedExportTypes =
  | 'pngV2'
  | 'printablePdfV2'
  | 'csv_v2'
  | 'csv_searchsource'
  | 'lens_csv';

/**
 * @public
 * Definition of a menu item rendered in the share menu. In the redesign, the
 * `shareMenuItem` is shown in a modal. However, Canvas
 * uses the legacy panel implementation.
 * */

interface ShareMenuItemBase {
  shareMenuItem?: ShareContextMenuPanelItem;
}

export interface ShareMenuItemLegacy extends ShareMenuItemBase {
  panel?: EuiContextMenuPanelDescriptor;
}

export interface ScreenshotExportOpts {
  optimizedForPrinting?: boolean;
  intl: InjectedIntl;
}

export interface ShareMenuItemV2 extends ShareMenuItemBase {
  // extended props to support share modal
  label: 'PDF' | 'CSV' | 'PNG';
  reportType?: SupportedExportTypes;
  requiresSavedState?: boolean;
  helpText?: ReactElement;
  copyURLButton?: { id: string; dataTestSubj: string; label: string };
  generateExportButton?: ReactElement;
  /**
   * Function to trigger an export
   */
  generateExport: (args: ScreenshotExportOpts) => Promise<unknown>;
  /**
   * Function to generate a URL to be used for automating export
   * Not applicable for exports that do not call a remote API (i.e Lens CSV export)
   */
  generateExportUrl?: (args: ScreenshotExportOpts) => string | undefined;
  theme?: ThemeServiceSetup;
  renderLayoutOptionSwitch?: boolean;
  layoutOption?: 'print';
  generateCopyUrl?: URL;
  renderCopyURLButton?: boolean;
  warnings?: Array<{ title: string; message: string }>;
}

export interface ShareMenuProviderV2 {
  readonly id: string;
  getShareMenuItems: (context: ShareContext) => ShareMenuItemV2[];
}
export interface ShareMenuProviderLegacy {
  readonly id: string;
  getShareMenuItemsLegacy: (context: ShareContext) => ShareMenuItemLegacy[];
}

/**
 * @public
 * A source for additional menu items shown in the share context menu. Any provider
 * registered via `share.register()` will be called if a consumer displays the context
 * menu. Returned `ShareMenuItem`s will be shown in the context menu together with the
 * default built-in share options. Each share provider needs a globally unique id.
 * */
export type ShareMenuProvider = ShareMenuProviderV2 | ShareMenuProviderLegacy;

interface UrlParamExtensionProps {
  setParamValue: (values: {}) => void;
}

export interface UrlParamExtension {
  paramName: string;
  component: ComponentType<UrlParamExtensionProps>;
}

/** @public */
export interface ShowShareMenuOptions extends Omit<ShareContext, 'onClose'> {
  anchorElement: HTMLElement;
  allowEmbed: boolean;
  allowShortUrl: boolean;
  embedUrlParamExtensions?: UrlParamExtension[];
  snapshotShareWarning?: string;
  onClose?: () => void;
  publicAPIEnabled?: boolean;
}

export interface ClientConfigType {
  new_version: { enabled: boolean };
}
