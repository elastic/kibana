export interface LanguageIntegration {
    id: string;
    title: string;
    icon?: string;
    euiIconName?: string;
    description: string;
    docUrlTemplate: string;
    integrationsAppUrl: string;
    exportLanguageUiComponent: boolean;
}
export declare const languageIntegrations: LanguageIntegration[];
