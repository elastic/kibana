import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
interface Context {
    data: DataPublicPluginStart;
    queryString: string;
}
export declare function isActionCompatible(data: DataPublicPluginStart): Promise<boolean>;
export declare function executeAction({ queryString, data }: Context): Promise<void>;
export {};
