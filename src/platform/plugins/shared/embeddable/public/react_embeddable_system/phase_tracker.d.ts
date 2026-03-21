import type { PhaseEvent } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
export declare class PhaseTracker {
    private firstLoadCompleteTime;
    private embeddableStartTime;
    private subscriptions;
    private phase$;
    getPhase$(): BehaviorSubject<PhaseEvent | undefined>;
    trackPhaseEvents(uuid: string, api: unknown): void;
    cleanup(): void;
}
