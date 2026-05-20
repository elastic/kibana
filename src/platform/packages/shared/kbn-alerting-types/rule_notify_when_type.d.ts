export declare const RuleNotifyWhenTypeValues: readonly ["onActionGroupChange", "onActiveAlert", "onThrottleInterval"];
export type RuleNotifyWhenType = (typeof RuleNotifyWhenTypeValues)[number];
export declare enum RuleNotifyWhen {
    CHANGE = "onActionGroupChange",
    ACTIVE = "onActiveAlert",
    THROTTLE = "onThrottleInterval"
}
