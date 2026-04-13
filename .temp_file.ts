interface SimulationFeedback {
  valid: boolean;
  errors?: string[];
  metrics?: {
    sampled: number;
    fields: string[];
    parse_rate: number;
  };
  processors?: Record<string, {
    failed_rate: number;
    errors?: string[];
  }>;
}
