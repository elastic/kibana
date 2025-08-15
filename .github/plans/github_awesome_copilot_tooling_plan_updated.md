# GitHub Awesome Copilot Tooling - Original Resource Plan

> **Note**: This file contains the original high-level overview. For detailed iteration instructions, see [`detailed_oas_quality_automation_plan.md`](./detailed_oas_quality_automation_plan.md).

Here are the best resources, chatmodes, and instructions from the github/awesome-copilot repository for planning, optimizing, and implementing your solution to provide feedback on PRs about OAS health/quality integrated with CI for a monorepo (like elastic/kibana):

### 1. Planning Phase

**a. PRD Chat Mode (`chatmodes/prd.chatmode.md`):**
- Use this for structuring your initial plan. It guides you to:
  - Ask clarifying questions about requirements, constraints, and technical details.
  - Analyze the codebase for integration points and architecture constraints.
  - Organize your plan using clear user stories, acceptance criteria, and checklists.
  - Confirm and iterate on requirements before implementation.
  - [PRD Chatmode Instructions Example](https://github.com/github/awesome-copilot/blob/main/chatmodes/prd.chatmode.md)

**b. Prompt Builder Instructions – Research & Analysis Phase (`chatmodes/prompt-builder.chatmode.md`):**
- Gather and analyze all relevant information, including build, deployment, and configuration requirements.
- Analyze existing codebase patterns and conventions.
- Fetch official guidelines and specifications.
- [Process Overview](https://github.com/github/awesome-copilot/blob/main/chatmodes/prompt-builder.chatmode.md)

### 2. Optimizing the Plan

**a. Prompt Builder Instructions – Improvement & Validation Phases (`chatmodes/prompt-builder.chatmode.md`):**
- Make targeted improvements based on testing and research findings.
- Integrate actionable instructions and concrete examples from research.
- Validate improvements with a Prompt Tester (test, receive feedback, iterate).
- Ensure compliance with standards, logical flow, and clarity.
- [Improvement Phase](https://github.com/github/awesome-copilot/blob/main/chatmodes/prompt-builder.chatmode.md)
- [Validation Phase](https://github.com/github/awesome-copilot/blob/main/chatmodes/prompt-builder.chatmode.md)

**b. Prompt Engineer Chat Mode (`chatmodes/prompt-engineer.chatmode.md`):**
- Use for systematic prompt analysis and improvement. Every input is treated as a prompt to be optimized.
- Encourages a chain-of-thought/reasoning-first approach before conclusions.
- Provides a framework to enhance clarity, structure, and specificity.
- [Prompt Engineer Guidelines](https://github.com/github/awesome-copilot/blob/main/chatmodes/prompt-engineer.chatmode.md)

**c. Instructions: AI Prompt Engineering & Safety Best Practices (`instructions/ai-prompt-engineering-safety-best-practices.instructions.md`):**
- Iterative prompt development, A/B testing, and automated evaluation.
- Continuous improvement, safety, quality monitoring, and feedback integration.
- [Best Practices Section](https://github.com/github/awesome-copilot/blob/main/instructions/ai-prompt-engineering-safety-best-practices.instructions.md)

### 3. Implementation Phase

**a. Prompt Builder Instructions – Creation & Update Requirements (`chatmodes/prompt-builder.chatmode.md`):**
- Gather information from all sources, research authoritative sources, and ensure alignment with existing patterns.
- For updates, compare against current best practices, preserve working elements, and prevent conflicts.
- [Prompt Creation Requirements](https://github.com/github/awesome-copilot/blob/main/chatmodes/prompt-builder.chatmode.md)

**b. Tool Integration Standards (`chatmodes/prompt-builder.chatmode.md`):**
- Use available tools (semantic/lexical search, repo research, documentation fetch) to inform and validate your implementation.
- Cross-reference findings for accuracy and authority.
- [Tool Integration](https://github.com/github/awesome-copilot/blob/main/chatmodes/prompt-builder.chatmode.md)

**c. Quality and Research Standards (`chatmodes/prompt-builder.chatmode.md`):**
- Prioritize official documentation and recognized experts.
- Ensure recommendations are current, cross-validated, and feasible for your monorepo/CI context.
- [Quality Standards](https://github.com/github/awesome-copilot/blob/main/chatmodes/prompt-builder.chatmode.md)

---

### **Recommended Workflow Using These Resources:**
1. **Start with PRD Chat Mode** for structured planning.
2. **Use Prompt Builder Instructions** to research, analyze, and gather requirements.
3. **Apply Prompt Engineer Chat Mode** to optimize prompt instructions and feedback mechanisms for OAS health/quality.
4. **Iterate and validate** improvements using Prompt Builder's testing and validation phases.
5. **Integrate safety and best practices** from the AI Prompt Engineering instructions.
6. **Document and communicate changes**, track metrics, and continuously improve based on feedback.

---

## Next Steps

**For detailed implementation guidance**, refer to the comprehensive plan in [`detailed_oas_quality_automation_plan.md`](./detailed_oas_quality_automation_plan.md) which includes:

- Step-by-step phase execution
- Detailed iteration instructions
- Specific deliverables and timelines
- Success criteria and metrics
- Technical implementation details

**Start Here**: Begin with Phase 1.1 in the detailed plan to create your PRD using PRD Chat Mode.
