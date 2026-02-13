# SecuritySolution Bug Report - Quick Start

This script fetches GitHub issues with "Bug" and "Team: SecuritySolution" labels from the last 24 hours and emails a report.

## Quick Setup (5 minutes)

### 1. Set Environment Variables

Create `~/.kibana_security_report_env`:

```bash
export GITHUB_TOKEN="your_github_token_here"
export SMTP_HOST="smtp.gmail.com"
export SMTP_PORT="587"
export SMTP_USER="your.email@gmail.com"
export SMTP_PASS="your_app_password"
export REPORT_EMAIL_TO="recipient@example.com"
```

### 2. Install Dependencies

```bash
cd /path/to/kibana
yarn kbn bootstrap
```

### 3. Test the Script

```bash
source ~/.kibana_security_report_env
node scripts/test_security_solution_bug_report.js
```

If tests pass, run the actual report:

```bash
node scripts/report_security_solution_bugs.js
```

### 4. Schedule Daily Execution

Add to crontab (`crontab -e`):

```cron
0 10 * * * source ~/.kibana_security_report_env && cd /path/to/kibana && node scripts/report_security_solution_bugs.js >> /var/log/security_bug_report.log 2>&1
```

## Files

- **scripts/report_security_solution_bugs.js** - Main script
- **scripts/README_SECURITY_SOLUTION_BUG_REPORT.md** - Full documentation
- **scripts/test_security_solution_bug_report.js** - Test script
- **scripts/run_security_solution_bug_report.sh** - Shell wrapper with validation
- **scripts/security_solution_bug_report.crontab** - Cron examples

## Getting Help

- **Gmail App Password**: Google Account → Security → 2-Step Verification → App passwords
- **GitHub Token**: GitHub Settings → Developer settings → Personal access tokens
- **Full docs**: See `scripts/README_SECURITY_SOLUTION_BUG_REPORT.md`

## Troubleshooting

**"Module not found"**: Run `yarn kbn bootstrap`

**"Bad credentials"**: Check your GITHUB_TOKEN

**"Invalid login"**: For Gmail, use an App Password, not your account password

**No issues found**: This is normal if there are no bugs in the last 24 hours
