import type { CoreSetup } from '@kbn/core/public';
import type { PublicContract } from '@kbn/utility-types';
import type { Logger } from '@kbn/logging';
import type { SearchSessionSavedObject } from '../sessions_client';
import type { UISession } from '../sessions_mgmt/types';
export type ISearchSessionEBTManager = PublicContract<SearchSessionEBTManager>;
export declare class SearchSessionEBTManager {
    private reportEventCore;
    private logger;
    constructor({ core, logger }: {
        core: CoreSetup;
        logger: Logger;
    });
    private reportEvent;
    trackBgsStarted({ entryPoint, session, }: {
        entryPoint: string;
        session: SearchSessionSavedObject;
    }): void;
    trackBgsCancelled({ session, cancelSource, }: {
        session: SearchSessionSavedObject;
        cancelSource: string;
    }): void;
    trackBgsOpened({ session, resumeSource }: {
        session: UISession;
        resumeSource: string;
    }): void;
    trackBgsListView({ entryPoint }: {
        entryPoint: string;
    }): void;
}
