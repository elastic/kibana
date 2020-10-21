import { IRouter, Version } from '../../../../src/core/server';

export function defineRoutes(router: IRouter, version: Version) {
  router.get(
    {
      path: '/api/version_branching_examples/example',
      validate: false,
    },
    async (context, request, response) => {
      const resp = version.before(Version.V_8_0_0) ? 'good' : 'bad';

      return response.ok({
        body: {
          resp,
        },
      });
    }
  );
}
