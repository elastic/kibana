export interface Frame {
    frame_type: number;
    inline: boolean;
    address_or_line: number;
    function_name: string;
    file_name: string;
    line_number: number;
    executable_file_name: string;
}
interface TopNFunction {
    id: string;
    rank: number;
    frame: Frame;
    sub_groups: Record<string, number>;
    self_count: number;
    total_count: number;
    self_annual_co2_tons: number;
    total_annual_co2_tons: number;
    self_annual_costs_usd: number;
    total_annual_costs_usd: number;
}
export interface ESTopNFunctions {
    self_count: number;
    total_count: number;
    self_annual_co2_tons: number;
    self_annual_cost_usd: number;
    topn: TopNFunction[];
}
export type AggregationField = 'service.name' | 'transaction.name';
export {};
