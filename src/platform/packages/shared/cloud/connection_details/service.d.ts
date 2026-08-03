import { BehaviorSubject } from 'rxjs';
import type { ApiKey } from './tabs/api_keys_tab/views/success_form/types';
import type { Format } from './tabs/api_keys_tab/views/success_form/format_select';
import type { ConnectionDetailsOpts, TabID, ConnectionDetailsTelemetryEvents } from './types';
export declare class ConnectionDetailsService {
    readonly opts: ConnectionDetailsOpts;
    readonly tabId$: BehaviorSubject<TabID>;
    readonly showCloudId$: BehaviorSubject<boolean>;
    readonly apiKeyName$: BehaviorSubject<string>;
    readonly apiKeyStatus$: BehaviorSubject<"configuring" | "creating">;
    readonly apiKeyError$: BehaviorSubject<unknown>;
    readonly apiKey$: BehaviorSubject<ApiKey | null>;
    readonly apiKeyFormat$: BehaviorSubject<Format>;
    readonly apiKeyHasAccess$: BehaviorSubject<boolean | null>;
    constructor(opts: ConnectionDetailsOpts);
    private checkApiKeyAccess;
    readonly setTab: (tab: TabID) => Promise<void>;
    readonly toggleShowCloudId: () => void;
    readonly setApiKeyName: (name: string) => void;
    readonly setApiKeyFormat: (format: Format) => void;
    private validateName;
    private readonly createKeyAsync;
    readonly createKey: () => void;
    readonly emitTelemetryEvent: (event: ConnectionDetailsTelemetryEvents) => void;
}
