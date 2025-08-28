# AI Assistant Implementation Roadmap - Security Solution

**Status**: Updated August 27, 2025  
**Phase**: 1A Complete + Phase 2 Task 3 Complete + **One Chat Integration Plan**  
**Next**: Phase 2 Task 1 - Security Incident Integration (w/ One Chat ES|QL Tools)  

---

## 🚀 **ONE CHAT INTEGRATION DISCOVERY**

**Research Complete**: August 27, 2025  
**Key Finding**: One Chat provides plug-and-play primitives that can accelerate our roadmap by 40-60%

### **Available One Chat Reusable Components**

1. **LangGraph Agent Infrastructure** ✅
   - Location: `x-pack/platform/plugins/shared/onechat/server/services/agents/modes/default/`
   - Complete StateGraph system with tool orchestration and multi-step reasoning
   - Event streaming and LangGraph-to-OneChat conversion

2. **Production-Ready ES|QL Tools** 🔥
   - **`executeEsqlTool`**: Direct ES|QL execution with tabular results
   - **`generateEsqlTool`**: Natural language to ES|QL with context awareness
   - **`naturalLanguageSearchTool`**: Intelligent DSL search with index selection
   - Location: `x-pack/platform/plugins/shared/onechat/server/services/tools/builtin/definitions/`

3. **Tool Framework** ✅
   - `BuiltinToolDefinition` interface with schema validation
   - `ExecutableTool` runtime execution system  
   - Automatic LangChain conversion via `toolsToLangchain()`

4. **Advanced Search Infrastructure** ✅
   - `relevanceSearchTool`, `indexExplorerTool`, `getIndexMappingsTool`, `listIndicesTool`

### **Integration Strategy & Impact**

**Strategy 1: Direct Tool Integration** (Immediate - Next Step)
- Import One Chat ES|QL tools directly into Security Solution
- Create security-focused wrappers with pre-configured indices
- **Time Savings**: 3-4 days → 1-2 days (50% reduction)

**Strategy 2: Hybrid Architecture** (Phase 3)  
- Integrate One Chat LangGraph for multi-step workflows
- Keep domain-specific security tools
- **Time Savings**: 5-7 days → 2-3 days (60% reduction)

**Strategy 3: Full Migration** (Long-term)
- Migrate to One Chat BuiltinToolDefinition format
- **Time Savings**: 40-50% across entire roadmap

---

## ✅ **COMPLETED WORK**

### **PM Phase 1 - Asset Information (80% Complete)**
- ✅ "Describe this asset" - **AssetInventory** tool with entity details, criticality, location, cloud info
- ✅ "When was this asset last active" - Shows @timestamp field
- ✅ "How important/critical is this asset" - Shows asset criticality level
- ✅ "What type of system is this asset" - Shows entity type and architecture
- ✅ "Where is this asset located" - Shows cloud provider, region
- ✅ "What is the IP address" - Shows host.ip when available
- ✅ "What operating system" - Shows host.os.name and host.os.type
- ✅ **ES|QL/KQL Query Generation** - **GenerateAssetESQLTool** implemented
- ✅ **Compliance status** - **AssetComplianceTool** implemented (CIS benchmarks, remediation)

**Entity Type Support:**
- ✅ Host entities (comprehensive field coverage)
- ✅ User entities (identity information)
- ✅ Service entities (service details)
- ✅ Generic entities (flexible entity support)

### **Phase 1A: Enhanced Tools - COMPLETE** ✅
- ✅ **Task 1**: Enhanced Asset Inventory Tool 
  - Location: `x-pack/solutions/security/plugins/security_solution/server/assistant/tools/asset_inventory_simple/`
  - Features: Multi-entity support, comprehensive field display, proper search
- ✅ **Task 2**: Asset-Specific ES|QL Query Generation Tool
  - Location: `x-pack/solutions/security/plugins/security_solution/server/assistant/tools/esql/generate_asset_esql_tool.ts`
  - Features: Reuses existing ES|QL infrastructure, asset-focused query templates

### **Phase 2 Task 3: Compliance & Misconfiguration Tool - COMPLETE** ✅
- ✅ **AssetComplianceTool**
  - Location: `x-pack/solutions/security/plugins/security_solution/server/assistant/tools/asset_compliance_tool/`
  - Features: Multi-entity support, resource ID matching, CIS benchmarks, remediation guidance
  - Data Source: `security_solution-*.misconfiguration_latest*` indices
  - **Verified**: 8,130 compliance findings, 901 findings for test asset "cloudbeatvm"
  - **Quality**: Production-ready, no ESLint warnings, proper complexity

---

## ❌ **REMAINING WORK**

### **PM Phase 1 - Missing Items (20%)**
- ❌ "Who owns this asset" - No ownership data retrieval
- ❌ "What are common attack paths" - No threat intelligence

### **PM Phase 2: Security Context Integration (HIGH VALUE)** 🔥
*Remaining effort: 1-2 days with One Chat integration (Task 3 completed)*

**Priority: HIGH - Core security value + One Chat acceleration**

1. **Task 1**: Security Incident Tool ⭐ **(RECOMMENDED NEXT)** 🚀
   - **Goal**: Query `.alerts-security.alerts-default` index
   - **Features**: Correlate alerts with asset data, show recent incidents and cases
   - **Value**: "Is this misconfigured asset actually being attacked?"
   - **NEW**: Leverage One Chat's `executeEsqlTool` + `generateEsqlTool` 
   - **Original Effort**: 2-3 days → **NEW Effort**: 1-2 days (50% reduction)

2. **Task 2**: Vulnerability Assessment Tool 🚀
   - **Goal**: Query `security_solution-*.vulnerability_latest-v1`
   - **Features**: Show CVEs, severity, patch status, risk scoring
   - **NEW**: Leverage One Chat's `naturalLanguageSearchTool` + `indexExplorerTool`
   - **Original Effort**: 1-2 days → **NEW Effort**: 0.5-1 day (50% reduction)

3. ✅ **Task 3**: Compliance & Misconfiguration Tool - **COMPLETED**
   - **AssetComplianceTool**: CIS Benchmark compliance status, remediation guidance
   - **Data Source**: `security_solution-*.misconfiguration_latest*` indices
   - **Status**: Production-ready, 8,130+ findings verified

4. **Task 4**: Protection Status Tool
   - **Goal**: Check Elastic Defend installation status
   - **Features**: Agent health monitoring, protection gap identification
   - **Effort**: 1 day

### **Phase 1B: Complete Single Asset Foundation**
*Estimated effort: 1-2 days*

**Priority: MEDIUM - Fill remaining PM Phase 1 gaps**

1. **Task 1**: Add Asset Ownership Data
   - Query ownership information (account, team info)
   - Enhance asset display with ownership context

2. **Task 2**: Attack Path Intelligence Integration
   - Add threat intelligence context for assets
   - Common attack patterns and risk factors

### **PM Phase 3: Inventory-Wide Intelligence**
*Estimated effort: 3-4 days*

**Goal: Environment-wide visibility and analysis**

1. **Task 1**: Inventory Summary Tool
   - Asset counts, breakdowns, statistics
   - Cross-asset vulnerability analysis
   - Protection coverage assessment

2. **Task 2**: Risk Prioritization Tool
   - Top risk assets across environment
   - Internet-facing vulnerable assets
   - Compliance gap analysis

3. **Task 3**: Advanced Query Generation
   - Complex multi-asset ES|QL queries
   - Asset relationship mapping
   - Bulk investigation templates

### **Phase 3: Advanced Agent Workflows** 🚀
*Estimated effort: 2-3 days (60% reduction with One Chat LangGraph)*

**Goal: LangGraph-based multi-step investigation workflows**

1. **Task 1**: Security Investigation Agent
   - **NEW**: Leverage One Chat's complete LangGraph infrastructure
   - Multi-tool orchestration for complex queries
   - "Is this host compromised?" → check alerts + vulns + events
   - Investigation planning and execution
   - **Original Effort**: 3-4 days → **NEW Effort**: 1-2 days

2. **Task 2**: Risk Assessment Agent  
   - **NEW**: Use One Chat's StateGraph system for multi-step analysis
   - Comprehensive risk calculation
   - Combined vulnerability + incident + misconfiguration analysis
   - **Original Effort**: 2-3 days → **NEW Effort**: 1 day

### **Phase 4: Advanced Query & Streaming** 🚀
*Estimated effort: 1-2 days (75% reduction - mostly integration work)*

**Goal: Advanced querying and real-time capabilities**
- **NEW**: Direct integration with One Chat's mature ES|QL utilities
- **NEW**: One Chat's built-in streaming response system
- **NEW**: One Chat's interactive query refinement infrastructure
- **Implementation**: Mostly configuration and security context addition

---

## 🎯 **IMPLEMENTATION STRATEGY**

### **Current Status**
- **Achievement**: 3 production-ready AI Assistant tools
- **Data Sources**: Entity store, compliance findings, ES|QL infrastructure
- **Code Quality**: All tools pass TypeScript compilation and ESLint validation
- **Testing**: Verified with local Elasticsearch data (8,130+ compliance findings)

### **Recommended Implementation Order** 🚀

1. **Phase 2 Task 1**: Security Incident Tool (1-2 days) ⭐ **NEXT**
   - **Why**: High impact + immediate One Chat ES|QL integration wins
   - **Approach**: Import One Chat `executeEsqlTool` + `generateEsqlTool`, create security wrappers
   - **NEW Strategy**: Direct tool integration with `.alerts-security.alerts-default` context
   
2. **Phase 2 Task 2**: Vulnerability Assessment Tool (0.5-1 day) 🚀
   - **Why**: Natural progression + One Chat search infrastructure reuse  
   - **Approach**: Leverage `naturalLanguageSearchTool` + `indexExplorerTool`
   
3. **Phase 1B**: Complete PM Phase 1 gaps (1-2 days)
   - **Why**: Fulfills original PM requirements completely
   
4. **Phase 2 Task 4**: Protection Status Tool (1 day)
   - **Why**: Completes security context picture
   
5. **Phase 3**: Advanced Agent Workflows (2-3 days) 🚀
   - **Why**: One Chat LangGraph provides 60% effort reduction
   - **Approach**: Integrate One Chat StateGraph system with security-specific nodes
   
6. **Phase 4**: Advanced Query & Streaming (1-2 days) 🚀
   - **Why**: One Chat infrastructure handles complexity
   
7. **PM Phase 3**: Inventory-Wide Intelligence (3-4 days)
   - **Why**: Scales insights across entire environment

### **Technical Implementation Notes**

**File Locations:**
- Security Tools: `x-pack/solutions/security/plugins/security_solution/server/assistant/tools/`
- **One Chat Tools**: `x-pack/platform/plugins/shared/onechat/server/services/tools/builtin/definitions/`
- **One Chat LangGraph**: `x-pack/platform/plugins/shared/onechat/server/services/agents/modes/default/`
- Registration: `x-pack/solutions/security/plugins/security_solution/server/assistant/tools/index.ts`
- Telemetry: `x-pack/solutions/security/plugins/elastic_assistant/server/lib/telemetry/event_based_telemetry.ts`
- Prompts: `x-pack/solutions/security/plugins/elastic_assistant/server/lib/prompt/tool_prompts.ts`

**Data Sources Available:**
- Entity Store: `.entities.v1.latest.security_*` (10,641+ entities)
- Compliance: `security_solution-*.misconfiguration_latest*` (8,130+ findings)
- Alerts: `.alerts-security.alerts-default` 
- Vulnerabilities: `security_solution-*.vulnerability_latest-v1`

**One Chat Integration Points:**
- **ES|QL Tools**: Import `executeEsqlTool`, `generateEsqlTool` from One Chat
- **Search Tools**: Reuse `naturalLanguageSearchTool`, `indexExplorerTool`
- **LangGraph**: Integrate `createAgentGraph`, `StateAnnotation` from One Chat
- **Tool Framework**: Use `BuiltinToolDefinition`, `toolsToLangchain()` patterns

**Quality Standards:**
- TypeScript compilation: ✅
- ESLint (no warnings): ✅
- Complexity limits: ✅
- Error handling: ✅
- Logging: ✅

---

## 🚀 **SUCCESS METRICS**

### **Phase 1 Success Criteria (ACHIEVED)**
- ✅ Users can get comprehensive asset information
- ✅ Users can generate asset-specific ES|QL queries
- ✅ Users can check compliance status and get remediation guidance

### **Phase 2 Success Criteria (IN PROGRESS)**
- 🎯 Users can correlate asset compliance with security incidents
- 🎯 Users can assess vulnerability exposure for assets
- 🎯 Users can check protection coverage and agent status

### **Phase 3 Success Criteria (FUTURE)**
- 🎯 Users can run multi-step security investigations
- 🎯 Users can get comprehensive risk assessments
- 🎯 Users can analyze security posture across entire environment

---

## 📊 **TOTAL EFFORT ESTIMATE**

**ORIGINAL ESTIMATE**: ~12-17 days for complete implementation  
**NEW ESTIMATE WITH ONE CHAT**: ~7-10 days for complete implementation (**40-50% reduction**)

**Breakdown:**
- Phase 2 completion: ~~3-4 days~~ → **1.5-2 days** (One Chat ES|QL tools)
- Phase 1B completion: 1-2 days (unchanged)  
- Phase 3 workflows: ~~5-7 days~~ → **2-3 days** (One Chat LangGraph)
- Phase 4 advanced features: ~~3-4 days~~ → **1-2 days** (One Chat infrastructure)
- PM Phase 3 inventory: 3-4 days (unchanged)

**Time Savings**: 5-7 days saved through One Chat integration  
**ROI Potential**: Extremely High - faster delivery + mature foundation + future extensibility

---

## 🎯 **IMMEDIATE NEXT STEPS**

1. **Import One Chat ES|QL Tools** (Priority 1)
   - Copy `executeEsqlTool` and `generateEsqlTool` patterns
   - Create security-focused wrappers with `.alerts-security.alerts-default` context
   - Test integration with existing AI Assistant prompt system

2. **Prototype Security Incident Tool** (Priority 2)  
   - Use imported tools to query security alerts by asset identifiers
   - Validate approach with real alert data
   - Measure performance vs ground-up implementation

3. **Plan LangGraph Integration** (Priority 3)
   - Study One Chat's StateGraph implementation
   - Design security-specific nodes and workflows
   - Prepare for Phase 3 advanced agent workflows

---

*This roadmap now leverages One Chat's mature primitives to accelerate delivery by 40-50% while building toward a comprehensive AI-powered security investigation platform. The principal engineer's insight about "plug-and-play primitives with no wasted effort" has proven transformational for our timeline.*