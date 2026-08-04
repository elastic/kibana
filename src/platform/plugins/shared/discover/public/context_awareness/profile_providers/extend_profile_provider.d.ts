import type { BaseProfileProvider } from '../profile_service';
/**
 * Extends a base profile provider with additional properties and profile methods
 * @param baseProvider The base profile provider
 * @param extension The extension to apply to the base profile provider
 * @returns The extended profile provider
 */
export declare const extendProfileProvider: <TProvider extends BaseProfileProvider<{}, {}>>(baseProvider: TProvider, extension: Partial<TProvider> & Pick<TProvider, "profileId">) => TProvider;
