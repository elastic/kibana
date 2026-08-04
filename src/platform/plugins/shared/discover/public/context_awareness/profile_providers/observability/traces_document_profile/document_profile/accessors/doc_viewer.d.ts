import type { ObservabilityIndexes } from '@kbn/discover-utils/src';
import type { DocumentProfileProvider } from '../../../../../profiles';
export declare const createGetDocViewer: (indexes: ObservabilityIndexes, profileId: string) => DocumentProfileProvider["profile"]["getDocViewer"];
