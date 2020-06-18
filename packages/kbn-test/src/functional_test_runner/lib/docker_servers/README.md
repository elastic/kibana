# Functional Test Runner - Docker Servers

In order to make it simpler to run some services while the functional tests are running, we've added the ability to execute docker containers while the tests execute for the purpose of exposing services to the tests. These containers are expected to expose an application via a single HTTP port and live for the life of the tests. If the application exits for any reason before the tests complete the tests will abort.

To configure docker servers in your FTR config add the `dockerServers` key to your config like so:

```ts
// import this helper to get TypeScript support for this section of the config
import { defineDockerServersConfig } from '@kbn/test';

export default function () {
  return {
    ...

    dockerServers: defineDockerServersConfig({
      // unique names are used in logging and to get the details of this server in the tests
      helloWorld: {
        /** disable this docker server unless the user sets some flag/env var */
        enabled: !!process.env.HELLO_WORLD_PORT,
        /** the docker image to pull and run */
        image: 'vad1mo/hello-world-rest',
        /** The port that this application will be accessible via locally */
        port: process.env.HELLO_WORLD_PORT,
        /** The port that the container binds to in the container */
        portInContainer: 5050,
        /**
         * OPTIONAL: string/regex to look for in the log, when specified the
         * tests won't start until a line containing this string, or matching
         * this expression is found.
         */
        waitForLogLine: /hello/,
        /**
         * OPTIONAL: function that is called when server is started, when defined
         * it is called to give the configuration an option to write custom delay
         * logic. The function is passed a DockerServer object, which is described
         * below, and an observable of the log lines produced by the application
         */
        async waitFor(server, logLine$) {
          await logLine$.pipe(
            filter(line => line.includes('...')),
            tap((line) => {
              console.log('marking server ready because this line was logged:', line);
              console.log('server accessible from url', server.url);
            })
          ).toPromise()
        }
      }
    })
  }
}
```

To consume the test server, use can use something like supertest to send request. Just make sure that you disable your test suite if the user doesn't choose to enable your docker server:

```ts
import makeSupertest from 'supertest-as-promised';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const dockerServers = getService('dockerServers');
  const log = getService('log');

  const server = dockerServers.get('helloWorld');
  const supertest = makeSupertest(server.url);

  describe('test suite name', function () {
    if (!server.enabled) {
      log.warning(
        'disabling tests because server is not enabled, set HELLO_WORLD_PORT to run them'
      );
      this.pending = true;
    }

    it('test name', async () => {
      await supertest.get('/foo/bar').expect(200);
    });
  });
}
```

## `DockerServersService`

The docker servers service is a core service that is always available in functional test runner tests. When you call `getService('dockerServers')` you will receive an instance of the `DockerServersService` class which has to methods:

### `has(name: string): boolean`

Determine if a name resolves to a known docker server.

### `isEnabled(name: string): boolean`

Determine if a named server is enabled.

### `get(name: string): DockerServer`

Get a `DockerServer` object for the server with the given name.


## `DockerServer`

The object passed to the `waitFor()` config function and returned by `DockerServersService#get()`

```ts
{
  url: string;
  name: string;

  portInContainer: number;
  port: number;
  image: string;
  waitForLogLine?: RegExp | string;
  waitFor?: (server: DockerServer, logLine$: Rx.Observable<string>) => Promise<boolean>;
}
```
