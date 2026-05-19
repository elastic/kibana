import type { QueryClient} from '@kbn/react-query';
import { QueryClientProvider } from '@kbn/react-query';
/**
 * Shared React Query client for content list queries.
 *
 * Uses conservative defaults:
 * - No automatic retries (errors surface immediately).
 * - Standard stale time and cache time.
 */
export declare const contentListQueryClient: QueryClient;
export { QueryClientProvider };
