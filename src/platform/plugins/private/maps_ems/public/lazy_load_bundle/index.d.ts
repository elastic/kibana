import type { EMSClient } from '@elastic/ems-client';
import type { BuildFlavor } from '@kbn/config';
import type { EMSSettings } from '../../common';
export declare function createEMSClientLazy(emsSettings: EMSSettings, version: string, buildFlavor?: BuildFlavor): Promise<EMSClient>;
