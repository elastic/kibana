import { type History } from 'history';
import type { HistoryLocationState } from '../build_services';
export declare class HistoryService {
    private history?;
    /**
     * Makes sure discover and context are using one instance of history.
     */
    getHistory(): History<HistoryLocationState>;
    /**
     * Discover currently uses two `history` instances: one from Kibana Platform and
     * another from `history` package. Below function is used every time Discover
     * app is loaded to synchronize both instances.
     *
     * This helper is temporary until https://github.com/elastic/kibana/issues/65161 is resolved.
     */
    syncHistoryLocations(): History<HistoryLocationState>;
}
