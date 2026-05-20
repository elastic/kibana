import type { BuildFlavor } from '@kbn/config';
import type { EMSClient } from '@elastic/ems-client';
import type { EMSSettings } from '../../common';
export declare function createEMSClient(emsSettings: EMSSettings, kbnVersion: string, buildFlavor?: BuildFlavor): EMSClient;
