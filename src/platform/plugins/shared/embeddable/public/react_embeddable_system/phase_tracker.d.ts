import type { HasUniqueId, PhaseEvent, PublishesDataLoading, PublishesRendered } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
export declare class PhaseTracker {
    private firstLoadCompleteTime;
    private readonly embeddableStartTime;
    private subscriptions;
    private phase$;
    constructor(startTime: number);
    getPhase$(): BehaviorSubject<PhaseEvent | undefined>;
    trackPhaseEvents(api: HasUniqueId & Partial<PublishesDataLoading & PublishesRendered>): void;
    cleanup(): void;
}
