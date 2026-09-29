/**
 * Stand-in for the app's `useKibana`. Outside a booted Kibana there is no
 * `context.services` to unwrap, so supply the one slice the Memory page reads:
 * the Nightshift client, used to fetch lineage for the detail view.
 */
export const useKibana = () => ({
  core: {},
  services: {},
  dependencies: {
    start: {
      nightshiftInvestigations: {
        investigationsClient: {
          fetch: async (endpoint: string) => {
            if (endpoint.includes('/lineage')) {
              return {
                ancestors: [
                  {
                    id: 'memory_promotion-playbook',
                    title: 'Promotion runbook: 2025 holiday traffic',
                    usefulness: 0.41,
                    archived: true,
                  },
                ],
              };
            }
            return {};
          },
        },
      },
    },
  },
});
