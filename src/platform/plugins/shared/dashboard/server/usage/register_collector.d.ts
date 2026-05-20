import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
export declare function registerDashboardUsageCollector(usageCollection: UsageCollectionSetup, getTaskManager: Promise<TaskManagerStartContract>): void;
