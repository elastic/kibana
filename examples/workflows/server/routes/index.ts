import type { IRouter } from '@kbn/core/server';
import fetch from 'node-fetch';

async function fetchFromLocalhost(endpoint: string) {
  try {
    const response = await fetch(`http://localhost:8080/workflows`, {
      headers: {
        'kbn-xsrf': 'true',
        'x-api-key': '1234567',
      },
    });
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to fetch from localhost:8080: ${error.message}`);
  }
}

export function defineRoutes(router: IRouter) {
  router.get(
    {
      path: '/api/workflows/example',
      security: {
        authz: {
          requiredPrivileges: ['all'],
        },
      },
      validate: false,
    },
    async (context, request, response) => {
      try {
        const data = await fetchFromLocalhost('/your-endpoint');
        return response.ok({
          body: {
            time: new Date().toISOString(),
            data,
          },
        });
      } catch (error) {
        return response.customError({
          statusCode: 500,
          body: {
            message: `Error fetching data: ${error.message}`,
          },
        });
      }
    }
  );
}
