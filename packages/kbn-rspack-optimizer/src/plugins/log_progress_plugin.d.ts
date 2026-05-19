import { type RspackPluginInstance } from '@rspack/core';
import type { ToolingLog } from '@kbn/tooling-log';
/**
 * Signal the RSPack optimizer to stop all logging immediately.
 * Call this when SIGINT/SIGTERM is received.
 */
export declare function signalShutdown(): void;
/**
 * Reset the shutdown flag (for testing or restart scenarios).
 */
export declare function resetShutdown(): void;
/**
 * Create a log-based progress plugin that doesn't use dynamic terminal updates.
 * This avoids terminal state issues when pressing Ctrl+C.
 *
 * Logging strategy:
 * - Logs at 10% intervals
 * - Also logs if 10+ seconds have passed (never wait too long)
 * - Shows current stage (building, sealing, emitting, etc.)
 * - Shows elapsed time
 * - Immediately stops logging when shutdown is signaled
 *
 * @param log - ToolingLog instance for consistent formatting with Kibana's dev mode
 */
export declare function createLogProgressPlugin(log?: ToolingLog): RspackPluginInstance;
