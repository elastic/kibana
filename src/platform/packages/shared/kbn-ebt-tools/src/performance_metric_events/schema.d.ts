import type { RootSchema } from '@elastic/ebt/client';
/**
 * Structure of the `metric` event
 */
export interface PerformanceMetricEvent {
    /**
     * The name of the event that is tracked in the metrics i.e. kibana_loaded, kibana_started
     */
    eventName: string;
    /**
     * Searchable but not aggregatable metadata relevant to the tracked action.
     */
    meta?: Record<string, unknown>;
    /**
     * @group Standardized fields
     * The time (in milliseconds) it took to run the entire action.
     */
    duration: number;
    /**
     * @group Free fields for custom metrics (searchable and aggregatable)
     * Description label for the metric 1
     */
    key1?: string;
    /**
     * @group Free fields for custom metrics (searchable and aggregatable)
     * Value for the metric 1
     */
    value1?: number;
    /**
     * @group Free fields for custom metrics (searchable and aggregatable)
     * Description label for the metric 2
     */
    key2?: string;
    /**
     * @group Free fields for custom metrics (searchable and aggregatable)
     * Value for the metric 2
     */
    value2?: number;
    /**
     * @group Free fields for custom metrics (searchable and aggregatable)
     * Description label for the metric 3
     */
    key3?: string;
    /**
     * @group Free fields for custom metrics (searchable and aggregatable)
     * Value for the metric 3
     */
    value3?: number;
    /**
     * @group Free fields for custom metrics (searchable and aggregatable)
     * Description label for the metric 4
     */
    key4?: string;
    /**
     * @group Free fields for custom metrics (searchable and aggregatable)
     * Value for the metric 4
     */
    value4?: number;
    /**
     * @group Free fields for custom metrics (searchable and aggregatable)
     * Description label for the metric 5
     */
    key5?: string;
    /**
     * @group Free fields for custom metrics (searchable and aggregatable)
     * Value for the metric 5
     */
    value5?: number;
    /**
     * @group Free fields for custom metrics (searchable and aggregatable)
     * Description label for the metric 6
     */
    key6?: string;
    /**
     * @group Free fields for custom metrics (searchable and aggregatable)
     * Value for the metric 6
     */
    value6?: number;
    /**
     * @group Free fields for custom metrics (searchable and aggregatable)
     * Description label for the metric 7
     */
    key7?: string;
    /**
     * @group Free fields for custom metrics (searchable and aggregatable)
     * Value for the metric 7
     */
    value7?: number;
    /**
     * @group Free fields for custom metrics (searchable and aggregatable)
     * Description label for the metric 8
     */
    key8?: string;
    /**
     * @group Free fields for custom metrics (searchable and aggregatable)
     * Value for the metric 8
     */
    value8?: number;
    /**
     * @group Free fields for custom metrics (searchable and aggregatable)
     * Description label for the metric 9
     */
    key9?: string;
    /**
     * @group Free fields for custom metrics (searchable and aggregatable)
     * Value for the metric 9
     */
    value9?: number;
}
export declare const METRIC_EVENT_SCHEMA: RootSchema<PerformanceMetricEvent>;
