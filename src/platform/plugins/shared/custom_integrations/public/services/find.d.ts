import type { CustomIntegration } from '../../common';
interface FindParams {
    eprPackageName?: string;
    shipper?: string;
}
/**
 * A plugin service that finds and returns custom integrations.
 */
export interface CustomIntegrationsFindService {
    findReplacementIntegrations(params?: FindParams): Promise<CustomIntegration[]>;
    findAppendedIntegrations(params?: FindParams): Promise<CustomIntegration[]>;
}
/**
 * Filter a set of integrations by eprPackageName, and/or shipper.
 */
export declare const filterCustomIntegrations: (integrations: CustomIntegration[], { eprPackageName, shipper }?: FindParams) => CustomIntegration[];
export {};
