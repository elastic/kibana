import { useQuery } from '@tanstack/react-query';
import { WorkflowListDto } from '../../../../common/workflows/models/types';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useQueryClient } from '@tanstack/react-query';

export function useWorkflows() {
  const { http } = useKibana().services;

  const queryResult = useQuery<WorkflowListDto>({
    queryKey: ['workflows'],
    queryFn: () => http!.post('/api/workflows'),
  });

  const queryClient = useQueryClient();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['workflows'] });
  };

  return {
    ...queryResult,
    refresh,
  };
}
