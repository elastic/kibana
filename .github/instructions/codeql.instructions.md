---
applyTo: "{**/plugins/**/*.ts,**/packages/**/*.ts}"
---

# CodeQL Review Guidelines

> **Critical Security Requirement:** CodeQL inline suppressions must include proper justifications. Suppressing security alerts without clear reasoning is a security risk.

## Review Style
- Be specific and actionable in feedback
- Explain the "why" behind recommendations
- Verify that suppressions are truly necessary, not just convenient
- Ask for clarification if the justification is unclear

## CodeQL Inline Suppressions

**When reviewing:** Check all `// codeql[rule-id]` comments. Verify they include a proper justification explaining why the suppression is necessary.

**Format:** `// codeql[rule-id] justification text`

** Correct Implementation:**
```ts
// codeql[js/path-injection] User input is validated against an allowlist before use
const fs = require('fs');
return fs.readFileSync(`/etc/${validatedPath}`, 'utf8');

// codeql[js/xss] User input is sanitized by the template engine before rendering
return `<div>${sanitizedInput}</div>`;

// codeql[js/command-injection] Command arguments are escaped using shell-quote library
const command = `ls -la ${shellQuote.quote([userInput])}`;
```

**Flag these issues:**

1. **Missing Justification:**
   ```ts
   // codeql[js/path-injection]
   return fs.readFileSync(`/etc/${userInput}`, 'utf8');
   ```

2. **Generic Justification:**
   ```ts
   // codeql[js/xss] false positive
   return `<div>${userInput}</div>`;
   
   // codeql[js/command-injection] safe
   exec(`ls ${userInput}`);
   
   // codeql[js/path-injection] not a vulnerability
   fs.readFileSync(`/etc/${userInput}`, 'utf8');
   ```

3. **Incomplete Justification:**
   ```ts
   // codeql[js/xss] sanitized
   return `<div>${userInput}</div>`;
   // Missing: How is it sanitized? By what mechanism?
   ```

**Good justification examples:**
- `"User input is validated against an allowlist of known safe values"`
- `"Input is escaped using DOMPurify before insertion into HTML"`
- `"Path is normalized and checked against a whitelist of allowed directories"`
- `"Command arguments are escaped using the shell-quote library"`
- `"This is test code for CodeQL alert processing, not production code"`

## Summary

**Key Points for Reviewers:**

1. **CodeQL inline suppressions MUST include a specific justification explaining why the suppression is necessary**
2. **Generic justifications like "false positive", "safe", or "not a vulnerability" are not acceptable**
3. **Justifications should explain the security mechanism or context that makes the suppression valid**

## References

- [CodeQL Documentation](https://docs.github.com/en/code-security/concepts/code-scanning/about-code-scanning-alerts)

