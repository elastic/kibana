import type { CoreSetup, Plugin } from '@kbn/core/public';
import { DocViewsRegistry } from '@kbn/unified-doc-viewer';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { DiscoverSharedPublicStart } from '@kbn/discover-shared-plugin/public';
import type { UnifiedDocViewerServices } from './types';
export declare const getUnifiedDocViewerServices: import("@kbn/kibana-utils-plugin/public").Get<UnifiedDocViewerServices>, setUnifiedDocViewerServices: import("@kbn/kibana-utils-plugin/public").Set<UnifiedDocViewerServices>;
export interface UnifiedDocViewerSetup {
    registry: DocViewsRegistry;
}
export interface UnifiedDocViewerStart {
    registry: DocViewsRegistry;
}
export interface UnifiedDocViewerStartDeps {
    data: DataPublicPluginStart;
    fieldFormats: FieldFormatsStart;
    fieldsMetadata: FieldsMetadataPublicStart;
    share: SharePluginStart;
    discoverShared: DiscoverSharedPublicStart;
}
export declare class UnifiedDocViewerPublicPlugin implements Plugin<UnifiedDocViewerSetup, UnifiedDocViewerStart, {}, UnifiedDocViewerStartDeps> {
    private docViewsRegistry;
    setup(core: CoreSetup<UnifiedDocViewerStartDeps, UnifiedDocViewerStart>): {
        registry: DocViewsRegistry;
    };
    start(core: CoreStart, deps: UnifiedDocViewerStartDeps): {
        registry: DocViewsRegistry;
    };
}
