import type { SimilarSpansProps } from '.';
export declare function getEsqlQuery({ serviceName, spanName, transactionName, transactionType, }: Pick<SimilarSpansProps, 'serviceName' | 'spanName' | 'transactionName' | 'transactionType'>): import("@kbn/esql-composer").QueryOperator | undefined;
