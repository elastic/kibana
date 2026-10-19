/**
 * Every workflow validation rule, keyed by its stable rule ID. A rule ID is the
 * machine-readable identity of a check: it is not translated and does not change when
 * the message is reworded, so quick fixes, telemetry and suppression can key off it.
 *
 * `owner` is the validator that emits the rule, `defaultSeverity` is a default an
 * emitter may override, and `values` documents the message's interpolation parameters
 * (not yet enforced at call sites).
 *
 * Adding a check means adding an entry here first: `WorkflowValidationRuleId` is
 * derived from these keys, so an unregistered rule ID does not compile.
 */
export interface WorkflowValidationRules {
    yamlSyntaxError: {
        owner: 'yaml';
        defaultSeverity: 'error';
        values: {
            reason: string;
        };
    };
    /** The document parses but violates the workflow JSON Schema. */
    schemaViolation: {
        owner: 'yaml';
        defaultSeverity: 'error';
        values: {
            reason: string;
        };
    };
    duplicateStepName: {
        owner: 'step-name-validation';
        defaultSeverity: 'error';
        values: {
            stepName: string;
            occurrences: number;
        };
    };
    /** The execution graph could not be built from the definition. */
    graphBuildError: {
        owner: 'graph-build-validation';
        defaultSeverity: 'error';
        values: {
            reason: string;
        };
    };
    /** A foreach item whose element type is only known at runtime. */
    foreachItemRuntimeType: {
        owner: 'variable-validation';
        defaultSeverity: 'warning';
        values: {
            description: string;
        };
    };
    invalidVariablePath: {
        owner: 'variable-validation';
        defaultSeverity: 'error';
        values: {
            key: string;
        };
    };
    variablePathParseError: {
        owner: 'variable-validation';
        defaultSeverity: 'error';
        values: {
            reason: string;
        };
    };
    /** The variable resolves, but not to something valid in this position. */
    invalidVariableReference: {
        owner: 'variable-validation';
        defaultSeverity: 'error';
        values: {
            propertyPath: string;
        };
    };
    /** Inference could not determine the variable's type. */
    unknownVariableType: {
        owner: 'variable-validation';
        defaultSeverity: 'warning';
        values: {
            propertyPath: string;
        };
    };
    /** A `{% for %}` collection path that does not resolve to something iterable. */
    invalidCollectionPath: {
        owner: 'variable-validation';
        defaultSeverity: 'error';
        values: {
            collectionPath: string;
        };
    };
    /** A foreach parameter that is not a usable collection. */
    invalidForeachParameter: {
        owner: 'variable-validation';
        defaultSeverity: 'warning';
        values: {
            reason: string;
        };
    };
    liquidSyntaxError: {
        owner: 'liquid-template-validation';
        defaultSeverity: 'error';
        values: {
            reason: string;
        };
    };
    connectorNotFound: {
        owner: 'connector-id-validation';
        defaultSeverity: 'error';
        values: {
            displayName: string;
            id: string;
        };
    };
    invalidStepProperty: {
        owner: 'step-property-validation';
        defaultSeverity: 'error';
        values: {
            reason: string;
        };
    };
    /** An input key the target workflow does not declare. */
    unknownInputKey: {
        owner: 'workflow-inputs-validation';
        defaultSeverity: 'warning';
        values: {
            inputName: string;
            workflowName: string;
        };
    };
    /** An input value whose type does not match the declared input. */
    invalidInputType: {
        owner: 'workflow-inputs-validation';
        defaultSeverity: 'error';
        values: {
            inputName: string;
            expectedType: string;
            actualType: string;
        };
    };
    missingRequiredInput: {
        owner: 'workflow-inputs-validation';
        defaultSeverity: 'error';
        values: {
            inputName: string;
            workflowName: string;
        };
    };
    targetWorkflowNotFound: {
        owner: 'workflow-inputs-validation';
        defaultSeverity: 'error';
        values: {
            workflowId: string;
        };
    };
    invalidWorkflowOutput: {
        owner: 'workflow-output-validation';
        defaultSeverity: 'error';
        values: {
            reason: string;
        };
    };
    /** `=` used where `==` was meant. */
    invalidEqualityOperator: {
        owner: 'if-condition-validation';
        defaultSeverity: 'error';
        values: Record<string, never>;
    };
    /** An unsupported inequality operator. */
    invalidInequalityOperator: {
        owner: 'if-condition-validation';
        defaultSeverity: 'error';
        values: Record<string, never>;
    };
    /** Assignment used inside a condition. */
    invalidAssignmentOperator: {
        owner: 'if-condition-validation';
        defaultSeverity: 'error';
        values: Record<string, never>;
    };
    /** The condition is not parseable as KQL. */
    invalidIfConditionSyntax: {
        owner: 'if-condition-validation';
        defaultSeverity: 'error';
        values: {
            reason: string;
        };
    };
    invalidTriggerCondition: {
        owner: 'trigger-condition-validation';
        defaultSeverity: 'error';
        values: {
            reason: string;
        };
    };
    /** A declared default value does not satisfy its own property schema. */
    invalidDefaultValue: {
        owner: 'json-schema-default-validation';
        defaultSeverity: 'error';
        values: {
            propertyName: string;
            reason: string;
        };
    };
    /** A parallel step with no `concurrency` limit. */
    unboundedParallelFanOut: {
        owner: 'parallel-fan-out-validation';
        defaultSeverity: 'warning';
        values: {
            stepId: string;
        };
    };
    /** A parallel step whose static list exceeds the default fan-out maximum. */
    parallelFanOutExceedsLimit: {
        owner: 'parallel-fan-out-validation';
        defaultSeverity: 'warning';
        values: {
            stepId: string;
            itemCount: number;
            maxFanOut: number;
        };
    };
    /** An unsupported combination of parallel mode options. */
    invalidParallelMode: {
        owner: 'parallel-mode-validation';
        defaultSeverity: 'error';
        values: Record<string, never>;
    };
    deprecatedStepType: {
        owner: 'deprecated-step-validation';
        defaultSeverity: 'warning';
        values: {
            stepType: string;
        };
    };
    ignoredFetcherSetting: {
        owner: 'deprecated-step-validation';
        defaultSeverity: 'warning';
        values: {
            stepName: string;
        };
    };
    /** A diagnostic forwarded from the ES|QL validator. */
    esqlDiagnostic: {
        owner: 'esql-validation';
        defaultSeverity: 'error';
        values: {
            reason: string;
        };
    };
}
/** The stable identity of a validation check. Never translated. */
export type WorkflowValidationRuleId = keyof WorkflowValidationRules;
/**
 * The validator that emits a rule. `yaml` covers diagnostics we do not author: the
 * `yaml` parser and the JSON Schema layer behind `monaco-yaml`.
 */
export type WorkflowValidationRuleOwner = WorkflowValidationRules[WorkflowValidationRuleId]['owner'];
interface WorkflowValidationRuleDefinition<K extends WorkflowValidationRuleId> {
    owner: WorkflowValidationRules[K]['owner'];
    defaultSeverity: WorkflowValidationRules[K]['defaultSeverity'];
}
/**
 * Runtime view of the registry. Mapped over `WorkflowValidationRuleId`, so omitting a
 * rule or misdeclaring its owner is a type error rather than a silent gap.
 */
export declare const WORKFLOW_VALIDATION_RULES: {
    [K in WorkflowValidationRuleId]: WorkflowValidationRuleDefinition<K>;
};
/** Every registered rule ID, sorted. Stable ordering keeps the snapshot test readable. */
export declare const WORKFLOW_VALIDATION_RULE_IDS: (keyof WorkflowValidationRules)[];
/** Narrow an arbitrary string to a registered rule ID. */
export declare function isWorkflowValidationRuleId(value: string): value is WorkflowValidationRuleId;
export {};
