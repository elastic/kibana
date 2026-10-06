import type { OTLPExportConfig } from '@kbn/tracing-config';
import { tracing } from '@elastic/opentelemetry-node/sdk';
export declare class OTLPSpanProcessor extends tracing.BatchSpanProcessor {
    constructor(config: OTLPExportConfig, protocol: 'grpc' | 'http' | 'proto');
}
