import { type IModalTabDeclaration } from '@kbn/shared-ux-tabbed-modal';
type IEmbedTab = IModalTabDeclaration<{
    url: string;
    isNotSaved: boolean;
}>;
export declare const embedTab: IEmbedTab;
export {};
