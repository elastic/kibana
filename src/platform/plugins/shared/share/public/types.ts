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
import type { Capabilities, ToastsSetup } from '@kbn/core/public';
import type { EuiIconProps } from '@elastic/eui';
import type { UrlService, LocatorPublic } from '../common/url_service';
import type { BrowserShortUrlClientFactoryCreateParams } from './url_service/short_urls/short_url_client_factory';
import type { BrowserShortUrlClient } from './url_service/short_urls/short_url_client';
import { AnonymousAccessServiceContract } from '../common/anonymous_access';

export interface ShareRegistryApiStart {
  urlService: BrowserUrlService;
  anonymousAccessServiceProvider?: () => AnonymousAccessServiceContract;
}

export type ShareTypes = 'link' | 'embed' | 'integration';

export type InternalShareActionIntent = Exclude<ShareTypes, 'integration'>;

type ShareActionUserInputBase<E extends Record<string, unknown> = Record<string, unknown>> = {
  /**
   * The title of the share action
   */
  draftModeCallOut?: ReactNode;
  helpText?: ReactElement;
  CTAButtonConfig?: {
    id: string;
    dataTestSubj: string;
    label: string;
  };
  snapshotShareWarning?: string;
} & E;

type ShareImplementationFactory<
  T extends ShareTypes,
  C extends Record<string, unknown> = Record<string, unknown>
> = T extends 'integration'
  ? {
      id: string;
      groupId?: string;
      shareType: T;
      config: (ctx: ShareContext & ShareRegistryApiStart) => C;
    }
  : {
      shareType: T;
      config: (ctx: ShareContext & ShareRegistryApiStart) => C;
    };

// New type definition to extract the config return type
type ShareImplementation<T> = Omit<T, 'config'> & {
  config: T extends ShareImplementationFactory<any, infer R> ? R : never;
};

/**
 * @description implementation definition for creating a share action for sharing object links
 */
export type LinkShare = ShareImplementationFactory<
  'link',
  {
    shortUrlService: ReturnType<BrowserUrlService['shortUrls']['get']>;
  }
>;

/**
 * @description implementation definition for creating a share action for sharing embed links
 */
export type EmbedShare = ShareImplementationFactory<
  'embed',
  {
    shortUrlService: ReturnType<BrowserUrlService['shortUrls']['get']>;
  }
>;

/**
 * @description skeleton definition for implementing a share action integration
 */
export type ShareIntegration<
  IntegrationParameters extends Record<string, unknown> = Record<string, unknown>
> = ShareImplementationFactory<'integration', IntegrationParameters>;

/**
 * @description Share integration implementation definition for performing exports within kibana
 */
export interface ExportShare
  extends ShareIntegration<{
    /**
     * @deprecated only kept around for legacy reasons
     */
    name?: string;
    /**
     * @deprecated only kept around for legacy reasons
     */
    icon?: EuiIconProps['type'];
    /**
     * @deprecated only kept around for legacy reasons
     */
    sortOrder?: number;
    label: string;
    exportType: string;
    generateAssetExport: (args: ScreenshotExportOpts) => Promise<unknown>;
    generateValueExport: (args: ScreenshotExportOpts) => string | undefined;
    warnings?: Array<{ title: string; message: string }>;
    requiresSavedState?: boolean;
    supportedLayoutOptions: ['print'];
    renderLayoutOptionSwitch?: boolean;
  }> {
  groupId: 'export';
}

export type ShareActionIntents = LinkShare | EmbedShare | ShareIntegration;

// Example usage
type LinkShareConfig = ShareImplementation<LinkShare>;
type EmbedShareConfig = ShareImplementation<EmbedShare>;
type ExportShareConfig = ShareImplementation<ExportShare>;
type ShareIntegrationConfig = ShareImplementation<ShareIntegration>;

export type ShareConfigs = LinkShareConfig | EmbedShareConfig | ExportShareConfig;

type LinkShareUIConfig = ShareActionUserInputBase<{
  /**
   *
   * @description allows a consumer to provide a custom method which when invoked
   * handles providing a share url in the context of said consumer
   */
  delegatedShareUrlHandler?: () => string;
}>;

type EmbedShareUIConfig = ShareActionUserInputBase<{
  embedUrlParamExtensions?: UrlParamExtension[];
  computeAnonymousCapabilities?: (anonymousUserCapabilities: Capabilities) => boolean;
  /**
   * @deprecated use computeAnonymousCapabilities defined on objectTypeMeta config
   */
  showPublicUrlSwitch?: (anonymousUserCapabilities: Capabilities) => boolean;
}>;

type ExportShareUIConfig = ShareActionUserInputBase<{}>;

export interface ShareUIConfig {
  link: LinkShareUIConfig;
  embed: EmbedShareUIConfig;
  export: ExportShareUIConfig;
}

export interface SharingData {
  title: string;
  locatorParams: {
    id: string;
    params: Record<string, unknown>;
  };
}

export abstract class ShareRegistryApi {
  abstract start(args: ShareRegistryApiStart): ShareRegistryApi;

  abstract registerShareIntegration<I extends ShareIntegration>(shareObject: string, arg: I): void;
  abstract registerShareIntegration<I extends ShareIntegration>(arg: I): void;

  abstract getShareConfigOptionsForObject(
    objectType: string
  ): Array<ShareActionIntents | undefined>;

  abstract resolveShareItemsForShareContext(args: ShareContext): ShareConfigs[];

  // abstract registerShareAction(app: string, args: ShareActionIntent[]): void;
  // abstract registerShareAction(args: ShareActionIntent[]): void;

  // // when toggling the share menu we keep it simple, only passing in the minimum required data, instead of a sleuth of options
  // // any extra check that is required to be done will happen behind the scenes for each share context
  // abstract toggleShare(context: string, data: SharingData): void;
}

export type BrowserUrlService = UrlService<
  BrowserShortUrlClientFactoryCreateParams,
  BrowserShortUrlClient
>;

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
  /**
   * The type of the object to share. for example lens, dashboard, etc.
   */
  objectType: string;
  /**
   * Allows for passing contextual information that each consumer can provide to customize the share menu
   */
  objectTypeMeta: {
    title: string;
    config: Partial<ShareUIConfig>;
  };
  /**
   * Id of the object that's been attempted to be shared
   */
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
  sharingData: { [key: string]: unknown };
  isDirty: boolean;
  onClose: () => void;
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
// export type ShareMenuProvider =  ShareMenuProviderLegacy;

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
  allowShortUrl: boolean;
  allowEmbed: boolean;
  onClose?: () => void;
  publicAPIEnabled?: boolean;
}

export interface ClientConfigType {
  new_version: { enabled: boolean };
}
