import type { BaseFeature } from './types';
export declare class FeaturesRegistry<Feature extends BaseFeature = BaseFeature> {
    private readonly features;
    register(feature: Feature): void;
    getById<Id extends Feature['id']>(id: Id): Extract<Feature, {
        id: Id;
    }> | undefined;
}
