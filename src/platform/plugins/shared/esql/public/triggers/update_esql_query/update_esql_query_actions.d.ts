import type { Action } from '@kbn/ui-actions-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
interface Context {
    queryString: string;
}
export declare class UpdateESQLQueryAction implements Action<Context> {
    protected readonly data: DataPublicPluginStart;
    type: string;
    id: string;
    order: number;
    constructor(data: DataPublicPluginStart);
    getDisplayName(): string;
    getIconType(): string;
    isCompatible(): Promise<boolean>;
    execute({ queryString }: Context): Promise<void>;
}
export {};
