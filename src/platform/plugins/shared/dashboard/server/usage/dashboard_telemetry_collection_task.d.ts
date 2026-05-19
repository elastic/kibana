import type { RunContext, TaskManagerSetupContract, TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import type { CoreSetup, Logger } from '@kbn/core/server';
export declare const TASK_ID = "Dashboard-dashboard_telemetry";
export declare function initializeDashboardTelemetryTask(logger: Logger, core: CoreSetup, taskManager: TaskManagerSetupContract, embeddable: EmbeddableSetup): void;
export declare function scheduleDashboardTelemetry(logger: Logger, taskManager: TaskManagerStartContract): Promise<import("@kbn/task-manager-plugin/server/task").TaskInstanceWithId | undefined>;
export declare function dashboardTaskRunner(logger: Logger, core: CoreSetup, embeddable: EmbeddableSetup): ({ taskInstance }: RunContext) => {
    run(): Promise<{
        state: Readonly<{} & {
            telemetry: Readonly<{} & {
                controls: Readonly<{} & {
                    total: number;
                    by_type: Record<string, Readonly<{} & {
                        total: number;
                    }>>;
                }>;
                sections: Readonly<{} & {
                    total: number;
                }>;
                panels: Readonly<{} & {
                    total: number;
                    by_type: Record<string, Readonly<{} & {
                        total: number;
                        details: Record<string, number>;
                        by_reference: number;
                        by_value: number;
                    }>>;
                    by_reference: number;
                    by_value: number;
                }>;
                access_mode: Record<string, Readonly<{} & {
                    total: number;
                }>>;
            }>;
            runs: number;
        }>;
        runAt: Date;
    } | {
        state: {
            runs: number;
        };
        runAt: Date;
    }>;
    cancel(): Promise<void>;
};
