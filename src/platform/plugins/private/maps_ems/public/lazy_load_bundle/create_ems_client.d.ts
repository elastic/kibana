import type { BuildFlavor } from '@kbn/config';
import { EMSClient } from '@elastic/ems-client';
import type { EMSSettings } from '../../common';
export declare function createEMSClient(emsSettings: EMSSettings, kbnVersion: string, buildFlavor?: BuildFlavor): EMSClient;
