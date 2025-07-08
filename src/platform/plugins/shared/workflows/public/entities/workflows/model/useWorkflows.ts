import { useQuery } from '@tanstack/react-query';
import { WorkflowListItemDTO } from '../../../../common/workflows/models/types';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useQueryClient } from '@tanstack/react-query';

interface WorkflowsPaginatedResponse {
  results: WorkflowListItemDTO[];
  _pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export function useWorkflows() {
  const { http } = useKibana().services;

  const queryResult = useQuery<WorkflowsPaginatedResponse>({
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
