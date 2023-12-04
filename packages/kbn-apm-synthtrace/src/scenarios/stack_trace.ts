/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ApmFields, apm, Instance } from '@kbn/apm-synthtrace-client';
import { Scenario } from '../cli/scenario';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';
import { withClient } from '../lib/utils/with_client';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<ApmFields> = async (runOptions) => {
  const { logger } = runOptions;

  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const languages = ['dotnet', 'go', 'java', 'node', 'php', 'python', 'ruby'];

      const stacktraceExamples: Record<string, string> = {
        dotnet: `Unhandled Exception: System.Runtime.InteropServices.MarshalDirectiveException: Cannot marshal 'parameter dotnet/corefx#2': Invalid managed/unmanaged type combination (Marshaling to and from COM interface pointers isn't supported).
          at Microsoft.Diagnostics.Runtime.DbgEngDataReader.DebugCreate(Guid& InterfaceId, Object& Interface)
          at Microsoft.Diagnostics.Runtime.DbgEngDataReader.CreateIDebugClient()
          at Microsoft.Diagnostics.Runtime.DbgEngDataReader..ctor(Int32 pid, AttachFlag flags, UInt32 msecTimeout)
          at Microsoft.Diagnostics.Runtime.DataTarget.AttachToProcess(Int32 pid, UInt32 msecTimeout, AttachFlag attachFlag)
          at Program.Main(String[] args) in /home/xxx/private/build/guard/Program.cs:line 21`,
        go: `goroutine 11 [running]:
          testing.tRunner.func1(0xc420092690)
                  /usr/local/go/src/testing/testing.go:711 +0x2d2
          panic(0x53f820, 0x594da0)
                  /usr/local/go/src/runtime/panic.go:491 +0x283
          github.com/yourbasic/bit.(*Set).Max(0xc42000a940, 0x0)
                  ../src/github.com/bit/set_math_bits.go:137 +0x89
          github.com/yourbasic/bit.TestMax(0xc420092690)
                  ../src/github.com/bit/set_test.go:165 +0x337
          testing.tRunner(0xc420092690, 0x57f5e8)
                  /usr/local/go/src/testing/testing.go:746 +0xd0
          created by testing.(*T).Run
                  /usr/local/go/src/testing/testing.go:789 +0x2de`,
        java: `java.lang.Throwable\n\tat co.elastic.otel.ElasticSpanProcessor.captureStackTrace(ElasticSpanProcessor.java:81)\n\tat co.elastic.otel.ElasticSpanProcessor.onEnd(ElasticSpanProcessor.java:56)\n\tat io.opentelemetry.sdk.trace.MultiSpanProcessor.onEnd(MultiSpanProcessor.java:52)\n\tat io.opentelemetry.sdk.trace.SdkSpan.endInternal(SdkSpan.java:451)\n\tat io.opentelemetry.sdk.trace.SdkSpan.end(SdkSpan.java:431)\n\tat io.opentelemetry.javaagent.instrumentation.opentelemetryapi.trace.ApplicationSpan.end(ApplicationSpan.java:140)\n\tat co.elastic.apm.opbeans.controllers.APIRestController.orders(APIRestController.java:140)\n\tat java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke0(Native Method)\n\tat java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke(NativeMethodAccessorImpl.java:77)\n\tat java.base/jdk.internal.reflect.DelegatingMethodAccessorImpl.invoke(DelegatingMethodAccessorImpl.java:43)\n\tat java.base/java.lang.reflect.Method.invoke(Method.java:568)\n\tat org.springframework.web.method.support.InvocableHandlerM`,
        node: `Error: Something unexpected has occurred.
          at main (c:\Users\Me\Documents\MyApp\app.js:9:15)
          at Object. (c:\Users\Me\Documents\MyApp\app.js:17:1)
          at Module._compile (module.js:460:26)
          at Object.Module._extensions..js (module.js:478:10)
          at Module.load (module.js:355:32)
          at Function.Module._load (module.js:310:12)
          at Function.Module.runMain (module.js:501:10)
          at startup (node.js:129:16)
          at node.js:814:3`,
        php: `#2 /usr/share/php/PHPUnit/Framework/TestCase.php(626): SeriesHelperTest->setUp()
          #3 /usr/share/php/PHPUnit/Framework/TestResult.php(666): PHPUnit_Framework_TestCase->runBare()
          #4 /usr/share/php/PHPUnit/Framework/TestCase.php(576): PHPUnit_Framework_TestResult->run(Object(SeriesHelperTest))
          #5 /usr/share/php/PHPUnit/Framework/TestSuite.php(757): PHPUnit_Framework_TestCase->run(Object(PHPUnit_Framework_TestResult))
          #6 /usr/share/php/PHPUnit/Framework/TestSuite.php(733): PHPUnit_Framework_TestSuite->runTest(Object(SeriesHelperTest), Object(PHPUnit_Framework_TestResult))
          #7 /usr/share/php/PHPUnit/TextUI/TestRunner.php(305): PHPUnit_Framework_TestSuite->run(Object(PHPUnit_Framework_TestResult), false, Array, Array, false)
          #8 /usr/share/php/PHPUnit/TextUI/Command.php(188): PHPUnit_TextUI_TestRunner->doRun(Object(PHPUnit_Framework_TestSuite), Array)
          #9 /usr/share/php/PHPUnit/TextUI/Command.php(129): PHPUnit_TextUI_Command->run(Array, true)
          #10 /usr/bin/phpunit(53): PHPUnit_TextUI_Command::main()
          #11 {main}"`,
        python: `Traceback (most recent call last):
          File "<stdin>", line 2, in <module>
          File "<stdin>", line 2, in do_something_that_might_error
          File "<stdin>", line 2, in raise_error`,
        ruby: `divide.rb:2:in \`/'
          divide.rb:2:in \`divide'
          divide.rb:5:in \`<main>'`,
      };

      const timestamps = range.interval('1m').rate(180);

      const instances = languages.map((lang) =>
        apm
          .service({
            name: `synth-${lang}`,
            environment: ENVIRONMENT,
            agentName: lang,
          })
          .instance(`instance-${lang}`)
      );

      const instanceSpans = (instance: Instance, stacktrace: string) =>
        timestamps.generator((timestamp) =>
          instance
            .transaction({ transactionName: `Transaction ${instance.fields['service.name']}` })
            .timestamp(timestamp)
            .duration(1000)
            .success()
            .children(
              instance
                .span({
                  spanName: `custom_operation`,
                  spanType: 'custom',
                  'code.stacktrace': stacktrace,
                })
                .duration(180)
                .destination('elasticsearch')
                .failure()
                .timestamp(timestamp)
            )
        );

      return withClient(
        apmEsClient,
        logger.perf('generating_apm_events', () =>
          instances.flatMap((instance) =>
            instanceSpans(instance, stacktraceExamples[`${instance.fields['agent.name']!}`])
          )
        )
      );
    },
  };
};

export default scenario;
