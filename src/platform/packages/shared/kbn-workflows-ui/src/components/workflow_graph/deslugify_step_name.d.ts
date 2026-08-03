/**
 * Turn a step name into a display-friendly title (e.g. `send_slack_message` ->
 * `Send Slack Message`, `fetchUserData` -> `Fetch User Data`). Known tech
 * acronyms are restored to all-caps (e.g. `http_request` -> `HTTP Request`).
 *
 * Display-only: never assign the result back to `step.name` or `data.label` —
 * the raw label is used to look up execution status by step name.
 */
export declare const deslugifyStepName: (name: string) => string;
