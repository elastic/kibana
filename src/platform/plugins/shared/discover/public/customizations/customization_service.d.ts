import type { Observable } from 'rxjs';
import type { SearchBarCustomization, UnifiedHistogramCustomization } from './customization_types';
export type DiscoverCustomization = SearchBarCustomization | UnifiedHistogramCustomization;
export type DiscoverCustomizationId = DiscoverCustomization['id'];
export interface DiscoverCustomizationService {
    set: (customization: DiscoverCustomization) => void;
    get: <TCustomizationId extends DiscoverCustomizationId>(id: TCustomizationId) => Extract<DiscoverCustomization, {
        id: TCustomizationId;
    }> | undefined;
    get$: <TCustomizationId extends DiscoverCustomizationId>(id: TCustomizationId) => Observable<Extract<DiscoverCustomization, {
        id: TCustomizationId;
    }> | undefined>;
    enable: (id: DiscoverCustomizationId) => void;
    disable: (id: DiscoverCustomizationId) => void;
}
export declare const createCustomizationService: () => DiscoverCustomizationService;
