import { useQuery, useQueryClient } from '@tanstack/react-query';
import { WorkflowModel } from '@kbn/workflows';
import { useKibana } from '@kbn/kibana-react-plugin/public';

export function useWorkflowDetail(id: string) {
  const { http } = useKibana().services;

  const queryResult = useQuery<WorkflowModel>({
    queryKey: ['workflows', id],
    queryFn: () => http!.get(`/api/workflows/${id}`),
  });

  const queryClient = useQueryClient();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['workflows', id] });
  };

  return { ...queryResult, refresh };
}
