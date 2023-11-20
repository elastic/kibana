# @kbn/elastic-agent-utils

A utility package providing functions for working with Elastic Agents. This package focuses on agent names used in various contexts, such as OpenTelemetry, Java, Rum (Real User Monitoring), Mobile, JRuby, and Serverless environments.

## Functions

- **`isOpenTelemetryAgentName`**

  ```typescript
  export function isOpenTelemetryAgentName(agentName: string): agentName is OpenTelemetryAgentName;
  ```

  Check if the provided agent name is part of the OpenTelemetry agents.

- **`isJavaAgentName`**

  ```typescript
  export function isJavaAgentName(agentName?: string): agentName is JavaAgentName;
  ```

  Check if the provided agent name is part of the Java agents.

- **`isRumAgentName`**

  ```typescript
  export function isRumAgentName(agentName?: string): agentName is RumAgentName;
  ```

  Check if the provided agent name is part of the Rum (Real User Monitoring) agents.

- **`isMobileAgentName`**

  ```typescript
  export function isMobileAgentName(agentName?: string): boolean;
  ```

  Check if the provided agent name is either an iOS or Android agent.

- **`isRumOrMobileAgentName`**

  ```typescript
  export function isRumOrMobileAgentName(agentName?: string): boolean;
  ```

  Check if the provided agent name is either a Rum agent or a Mobile agent.

- **`isIosAgentName`**

  ```typescript
  export function isIosAgentName(agentName?: string): boolean;
  ```

  Check if the provided agent name is "ios/swift."

- **`isAndroidAgentName`**

  ```typescript
  export function isAndroidAgentName(agentName?: string): boolean;
  ```

  Check if the provided agent name is "android/java."

- **`isJRubyAgentName`**

  ```typescript
  export function isJRubyAgentName(agentName?: string, runtimeName?: string): boolean;
  ```

  Check if the provided agent name is "ruby" and the runtime name is "jruby."

- **`isServerlessAgentName`**

  ```typescript
  export function isServerlessAgentName(serverlessType?: string): serverlessType is ServerlessType;
  ```

  Check if the provided serverless type is part of the supported Serverless environments.

- **`isAWSLambdaAgentName`**

  ```typescript
  export function isAWSLambdaAgentName(serverlessType?: string): serverlessType is ServerlessType;
  ```

  Check if the provided serverless type is "aws.lambda."

- **`isAzureFunctionsAgentName`**

  ```typescript
  export function isAzureFunctionsAgentName(
    serverlessType?: string
  ): serverlessType is ServerlessType;
  ```

  Check if the provided serverless type is "azure.functions."

## Additional Exports

The `@kbn/elastic-agent-utils` package also exports several constants and types for commonly used agent names. These exports can be utilized for broader categorizations and validations within your Elastic Agent projects.

### Agent Names Constants

- **`ELASTIC_AGENT_NAMES`**
  
  An array of Elastic Agent names, including various programming languages and platforms.

- **`OPEN_TELEMETRY_AGENT_NAMES`**
  
  An array of OpenTelemetry agent names, covering different languages and platforms supporting OpenTelemetry.

- **`JAVA_AGENT_NAMES`**
  
  An array of Java agent names, including both generic Java and OpenTelemetry Java agents.

- **`RUM_AGENT_NAMES`**
  
  An array of Real User Monitoring (RUM) agent names, encompassing both base JavaScript and specific RUM agents.

- **`SERVERLESS_TYPE`**
  
  An array of supported Serverless types, including AWS Lambda and Azure Functions.

### Agent Name Types

- **`ElasticAgentName`**
- **`OpenTelemetryAgentName`**
- **`JavaAgentName`**
- **`RumAgentName`**
- **`ServerlessType`**

  These types represent the available agent name categories, providing TypeScript type safety for agent name usage.

### Combined Agent Names

- **`AgentName`**
  
  A union type combining all agent name categories.

- **`AGENT_NAMES`**
  
  An array containing all available agent names from the combined categories.
