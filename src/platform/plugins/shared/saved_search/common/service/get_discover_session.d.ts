import type { DiscoverSession } from '../types';
import type { GetSavedSearchDependencies } from './get_saved_searches';
export declare const getDiscoverSession: (discoverSessionId: string, deps: GetSavedSearchDependencies) => Promise<DiscoverSession>;
