import { type IModalTabDeclaration } from '@kbn/shared-ux-tabbed-modal';
type ILinkTab = IModalTabDeclaration<{
    dashboardUrl: string;
    isNotSaved: boolean;
    setIsClicked: boolean;
}>;
export declare const linkTab: ILinkTab;
export {};
