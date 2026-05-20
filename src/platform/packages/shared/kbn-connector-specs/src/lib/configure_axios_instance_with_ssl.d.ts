import type { AxiosInstance } from 'axios';
import type { SSLSettings } from '@kbn/actions-utils';
import type { AuthContext } from '../connector_spec';
export declare function configureAxiosInstanceWithSsl(ctx: AuthContext, axiosInstance: AxiosInstance, sslOverrides: SSLSettings): AxiosInstance;
