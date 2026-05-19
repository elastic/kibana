import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { Filter } from '@kbn/es-query';
interface UseFilterManagerProps {
    disabled?: boolean;
    filters?: Filter[];
    filterManager: DataPublicPluginStart['query']['filterManager'];
}
export declare const useFilterManager: (props: UseFilterManagerProps) => {
    filters: Filter[];
};
export {};
