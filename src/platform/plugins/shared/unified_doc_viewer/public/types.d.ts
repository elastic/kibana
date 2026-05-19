export type { JsonCodeEditorProps } from './components';
export type { EsDocSearchProps } from './hooks';
export type { UnifiedDocViewerSetup, UnifiedDocViewerStart } from './plugin';
import type { DiscoverSharedPublicStart } from '@kbn/discover-shared-plugin/public';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { IToasts } from '@kbn/core/public';
import type { UnifiedDocViewerStart } from './plugin';
export interface UnifiedDocViewerServices {
    analytics: AnalyticsServiceStart;
    data: DataPublicPluginStart;
    fieldFormats: FieldFormatsStart;
    fieldsMetadata: FieldsMetadataPublicStart;
    toasts: IToasts;
    storage: Storage;
    uiSettings: IUiSettingsClient;
    unifiedDocViewer: UnifiedDocViewerStart;
    share: SharePluginStart;
    core: CoreStart;
    discoverShared: DiscoverSharedPublicStart;
}
