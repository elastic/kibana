import type { CoreStart } from '@kbn/core/public';
import type { ISessionsClient } from '../..';
import type { LocatorsStart } from './sessions_mgmt/types';
export declare class BackgroundSearchNotifier {
    private sessionsClient;
    private core;
    private locators;
    private pollingSubscription?;
    constructor(sessionsClient: ISessionsClient, core: CoreStart, locators: LocatorsStart);
    startPolling(interval: number): void;
    stopPolling(): void;
    private groupSessions;
    private updateSessions;
    private buildNotificationInfo;
    private getDefaultSessionName;
    private showNotifications;
}
