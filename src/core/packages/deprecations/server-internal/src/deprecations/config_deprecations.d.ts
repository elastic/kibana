import type { IConfigService } from '@kbn/config';
import type { DeprecationsFactory } from '../deprecations_factory';
interface RegisterConfigDeprecationsInfo {
    deprecationsFactory: DeprecationsFactory;
    configService: IConfigService;
}
export declare const registerConfigDeprecationsInfo: ({ deprecationsFactory, configService, }: RegisterConfigDeprecationsInfo) => void;
export {};
