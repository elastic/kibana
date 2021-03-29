import { schema } from '@kbn/config-schema';
import { Client } from '@elastic/elasticsearch';
import type { IRouter, Logger } from 'kibana/server';
import type { Stream } from 'stream';

export function defineRemoteTelemetryServiceMockRoute(logger: Logger, router: IRouter) {
  const esClient = new Client({
    node: 'http://localhost:9200',
    auth: {
      username: 'elastic',
      password: 'changeme',
    },
  });

  router.post(
    {
      path: '/v3/send/kibana-events',
      validate: {
        body: schema.stream(),
      },
      options: {
        authRequired: false,
        xsrfRequired: false,
        body: {
          accepts: 'application/x-ndjson',
          output: 'stream',
        },
      },
    },
    async (context, request, response) => {
      logger.info(`Received some telemetry!`);

      const strBody = await consumeStream(request.body);

      const events = strBody
        .split('\n')
        .map((event) => {
          try {
            return JSON.parse(event);
          } catch (err) {
            return null; // Usually in NDJSON requests the last line is empty
          }
        })
        .filter(Boolean)
        .reduce((acc, event) => {
          return [...acc, { index: { _index: 'event-based-telemetry' } }, event];
        }, []);

      if (events.length === 0) {
        return response.noContent();
      }

      const bulkResult = await esClient.bulk({
        body: events,
      });
      logger.info(`Indexed ${bulkResult.body.items.length} events`);
      return response.ok({ body: { events, bulkResult } });
    }
  );
}

async function consumeStream(stream: Stream): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    stream
      .on('data', (chunk) => (data += chunk))
      .on('error', (err) => reject(err))
      .on('end', (chunk) => {
        data += chunk;
        resolve(data);
      });
  });
}
