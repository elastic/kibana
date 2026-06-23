import type { ESQLAstUserAgentCommand, ESQLList } from '@elastic/esql/types';
export declare enum UserAgentPosition {
    AFTER_USER_AGENT_KEYWORD = "after_user_agent_keyword",
    AFTER_TARGET_FIELD = "after_target_field",// prefix typed, before '='
    AFTER_ASSIGN = "after_assign",// after '=', before expression is typed
    AFTER_EXPRESSION = "after_expression",// expression complete
    AFTER_WITH_KEYWORD = "after_with_keyword",
    WITHIN_OPTIONS = "within_options",
    WITHIN_PROPERTIES_ARRAY = "within_properties_array",
    AFTER_COMMAND = "after_command"
}
/** Returns the list AST node for the `properties` map entry, if any. */
export declare function getPropertiesList(command: ESQLAstUserAgentCommand): ESQLList | undefined;
export declare function getPosition(command: ESQLAstUserAgentCommand, cursorPosition: number): UserAgentPosition;
