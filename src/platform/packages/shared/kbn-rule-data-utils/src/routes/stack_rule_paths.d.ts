export declare const ruleDetailsRoute: '/rule/:ruleId';
export declare const createRuleRoute: '/create/:ruleTypeId';
export declare const createRuleFromTemplateRoute: '/create/template/:templateId';
export declare const editRuleRoute: '/edit/:id';
export declare const rulesAppDetailsRoute: '/rule/:ruleId';
export declare const ruleLogsRoute: '/logs';
/** Stack Management section id that owns classic (v1) Rules. */
export declare const TRIGGERS_ACTIONS_SECTION_ID: 'insightsAndAlerting';
/** Management app id for classic (v1) Rules (`PLUGIN_ID` in triggers_actions_ui). */
export declare const TRIGGERS_ACTIONS_APP_ID: 'triggersActions';
export declare const TRIGGERS_ACTIONS_MANAGEMENT_PATH: "insightsAndAlerting/triggersActions";
export declare const triggersActionsRoute: "/app/management/insightsAndAlerting/triggersActions";
export declare const rulesAppRoute: '/app/rules';
export declare const getRuleDetailsRoute: (ruleId: string) => string;
export declare const getRulesAppDetailsRoute: (ruleId: string) => string;
export declare const getCreateRuleRoute: (ruleTypeId: string) => string;
export declare const getCreateRuleFromTemplateRoute: (templateId: string) => string;
export declare const getEditRuleRoute: (ruleId: string) => string;
/**
 * Management app `path` for a classic v1 Rules sub-route.
 * Route helpers already include a leading slash; joining with another `/` produces `//create`.
 */
export declare const getTriggersActionsManagementPath: (route: string) => string;
